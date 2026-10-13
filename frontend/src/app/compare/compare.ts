import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, exhaustMap, forkJoin, map, of, switchMap } from 'rxjs';

import { AlertLevel } from '../alerts/alert';
import { AlertIcon } from '../alerts/alert-icon';
import { worstLevel } from '../alerts/alerts';
import { HubConnection } from '../connection/connection';
import { Device, DeviceService, deviceName, deviceState, notInUse } from '../devices/devices';
import { StatusDot } from '../devices/status-dot';
import { FleetValues } from '../devices/fleet-values';
import { I18n } from '../i18n/i18n';
import { MessageKey } from '../i18n/messages/en';
import { EvenColumns } from '../layout/even-columns';
import { BytesPipe } from '../metrics/bytes.pipe';
import { formatUptime } from '../metrics/format';
import { History, MetricsService, Point, Series } from '../metrics/metrics';
import { Summary } from '../metrics/summary';
import { SYSTEM_FACTS, factValues } from '../metrics/system';
import { PageVisibility } from '../page-visibility';
import { refreshIntervalMs } from '../history/history-store';
import { ChartLine, ChartUnit, LineChart } from '../history/line-chart';

/** A column of the table the rows can be sorted by, largest first. */
export type Column = 'cpu' | 'memory' | 'disk' | 'temperature' | 'network' | 'uptime' | 'alerts';

const COLUMNS: { id: Column; label: MessageKey }[] = [
  { id: 'cpu', label: 'compare.cpu' },
  { id: 'memory', label: 'compare.memory' },
  { id: 'disk', label: 'compare.disk' },
  { id: 'temperature', label: 'compare.temperature' },
  { id: 'network', label: 'compare.network' },
  { id: 'uptime', label: 'compare.uptime' },
  { id: 'alerts', label: 'compare.alerts' },
];

/** A row of the table of what each device is: its facts in the order of SYSTEM_FACTS. */
export interface SystemRow {
  device: Device;
  values: (string | undefined)[];
}

/** The facts of each device that tells them, in the order of the rows. */
export function systemRows(rows: readonly Row[]): SystemRow[] {
  return rows.flatMap(({ device, summary }) => {
    const system = summary?.system;
    return system ? [{ device, values: factValues(system, summary.version) }] : [];
  });
}

/** One row of the table: a device and its values, which are missing while it does not answer. */
export interface Row {
  device: Device;
  summary: Summary | null;
}

const LEVEL_ORDER: Record<AlertLevel, number> = { alert: 2, warning: 1 };

/** What a row is sorted by in a column; missing values sort last. */
export function sortValue(row: Row, column: Column): number | undefined {
  const s = row.summary;
  switch (column) {
    case 'cpu':
      return s?.cpu;
    case 'memory':
      return s?.memory;
    case 'disk':
      return s?.disk?.percent;
    case 'temperature':
      return s?.temperature?.celsius;
    case 'network':
      return s?.network && s.network.receive + s.network.send;
    case 'uptime':
      return s?.uptimeSeconds;
    case 'alerts': {
      const alerts = row.device.alerts ?? [];
      const level = worstLevel(alerts);
      return level ? LEVEL_ORDER[level] * 1000 + alerts.length : undefined;
    }
  }
}

/** The rows largest first in the column, missing values last and equal ones in the given order. */
export function sortRows(rows: readonly Row[], column: Column | null): Row[] {
  if (!column) {
    return [...rows];
  }
  const value = (row: Row) => sortValue(row, column) ?? -Infinity;
  return [...rows].sort((a, b) => value(b) - value(a));
}

/** A time range of the charts, ending now. */
interface Range {
  label: MessageKey;
  seconds: number;
}

const RANGES: Range[] = [
  { label: 'history.range1h', seconds: 3600 },
  { label: 'history.range6h', seconds: 6 * 3600 },
  { label: 'history.range1d', seconds: 86400 },
  { label: 'history.range7d', seconds: 7 * 86400 },
  { label: 'history.range30d', seconds: 30 * 86400 },
];

/** A chart with one line per device. */
interface CompareChart {
  title: MessageKey;
  unit: ChartUnit;
  max?: number;
  /** The device's line, from its history; `router` is set for a router. */
  points: (series: Series[], router: boolean) => Point[];
}

/** The largest value of the series of a kind at each time, such as the fullest disk. */
export function largest(series: Series[], kind: string): Point[] {
  const values = new Map<number, number>();
  for (const s of series.filter((s) => s.metric.startsWith(kind + ':'))) {
    for (const p of s.points) {
      values.set(p.time, Math.max(values.get(p.time) ?? -Infinity, p.value));
    }
  }
  return [...values].map(([time, value]) => ({ time, value })).sort((a, b) => a.time - b.time);
}

/** The points of a metric; none for a router's CPU and memory when it does not tell them. */
export function metric(series: Series[], name: string, router: boolean): Point[] {
  const points = series.find((s) => s.metric === name)?.points ?? [];
  return router && points.every((p) => p.value === 0) ? [] : points;
}

/**
 * The points of the steps within the range the charts show. For a device that does not answer, the
 * backend moves its history back to end at its last reading, which can be before the range.
 */
export function within(
  points: Point[],
  range: { from: number; to: number; step: number },
): Point[] {
  return points.filter((p) => p.time > range.from - range.step && p.time < range.to);
}

const CHARTS: CompareChart[] = [
  {
    title: 'compare.cpu',
    unit: 'percent',
    max: 100,
    points: (s, router) => metric(s, 'cpu', router),
  },
  {
    title: 'compare.memory',
    unit: 'percent',
    max: 100,
    points: (s, router) => metric(s, 'memory', router),
  },
  { title: 'compare.disk', unit: 'percent', max: 100, points: (s) => largest(s, 'disk') },
  { title: 'compare.temperature', unit: 'celsius', points: (s) => largest(s, 'temperature') },
];

/** The histories of the compared devices over one range. */
interface Histories {
  from: number;
  to: number;
  step: number;
  devices: { device: Device; history: History }[];
}

/**
 * Compares the devices: their main values now side by side in a table that sorts by any column,
 * and charts of the CPU, memory, fullest disk and hottest sensor with a line per device.
 */
@Component({
  selector: 'app-compare',
  imports: [AlertIcon, BytesPipe, DecimalPipe, EvenColumns, LineChart, StatusDot],
  templateUrl: './compare.html',
  styleUrl: './compare.css',
})
export class Compare {
  private readonly metrics = inject(MetricsService);
  private readonly page = inject(PageVisibility);
  protected readonly devices = inject(DeviceService);
  protected readonly i18n = inject(I18n);
  protected readonly connection = inject(HubConnection);

  protected readonly columns = COLUMNS;
  protected readonly factLabels = SYSTEM_FACTS;
  protected readonly ranges = RANGES;
  protected readonly sortedBy = signal<Column | null>(null);
  protected readonly range = signal(RANGES[2]);

  private readonly fleet = inject(FleetValues);
  private readonly summaries = this.fleet.summaries;
  protected readonly rows = computed(() =>
    sortRows(
      this.devices.devices().map((device) => ({
        device,
        summary: this.summaries().get(device.id) ?? null,
      })),
      this.sortedBy(),
    ),
  );

  /** What each device is, in the order of the table above; one that does not answer is left out. */
  protected readonly systems = computed(() => systemRows(this.rows()));

  /** The devices with a history to chart: all but checks, which keep only their response time. */
  private readonly charted = computed(
    () => this.devices.devices().filter((d) => !d.checked),
    // The list is read again every few seconds; the charts load again only when it changes.
    { equal: (a, b) => a.map((d) => d.id).join('\n') === b.map((d) => d.id).join('\n') },
  );
  private readonly histories = signal<Histories | null>(null);
  protected readonly charts = computed(() => {
    const h = this.histories();
    if (!h) {
      return [];
    }
    return CHARTS.map((chart) => ({
      title: this.i18n.t(chart.title),
      unit: chart.unit,
      max: chart.max,
      lines: h.devices
        .map(({ device, history }): ChartLine => ({
          label: deviceName(device, this.i18n),
          points: within(chart.points(history.series, !!device.router), h),
        }))
        .filter((line) => line.points.length > 0),
    })).filter((chart) => chart.lines.length > 0);
  });
  protected readonly chartRange = computed(() => this.histories());

  constructor() {
    this.fleet.watch.pipe(takeUntilDestroyed()).subscribe();

    toObservable(computed(() => ({ range: this.range(), devices: this.charted() })))
      .pipe(
        switchMap(({ range, devices }) =>
          this.page
            .ticks(refreshIntervalMs(range.seconds))
            .pipe(exhaustMap(() => this.readHistories(range.seconds, devices))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((histories) => this.histories.set(histories));
  }

  private readHistories(seconds: number, devices: Device[]): Observable<Histories> {
    const to = Math.floor(Date.now() / 1000);
    const from = to - seconds;
    if (devices.length === 0) {
      return of({ from, to, step: 60, devices: [] });
    }
    return forkJoin(
      devices.map((device) =>
        this.metrics.history(from, to, device.id).pipe(
          map((history) => ({ device, history })),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(
      map((answers) => {
        const read = answers.filter((a) => a !== null);
        return { from, to, step: read[0]?.history.stepSeconds ?? 60, devices: read };
      }),
    );
  }

  /** Sorts by the column, largest first, or back to the order of the devices when it is sorted by it. */
  protected sort(column: Column): void {
    this.sortedBy.update((c) => (c === column ? null : column));
  }

  /** Shows one device on its own, as when it is picked in the list of devices. */
  protected open(device: Device): void {
    this.devices.show(device.id);
  }

  protected deviceName(device: Device): string {
    return deviceName(device, this.i18n);
  }

  protected readonly state = deviceState;

  protected alertLevel(device: Device): AlertLevel | null {
    return worstLevel(device.alerts ?? []);
  }

  protected uptime(seconds: number): string {
    return formatUptime(seconds, this.i18n);
  }

  /**
   * Why a row has no values: the device does not answer, its values did not come in time for the
   * last read, or they are on their way.
   */
  protected noValues(row: Row): string {
    if (row.device.unreachable) {
      return this.i18n.t(notInUse(row.device) ? 'devices.notInUse' : 'devices.unreachable');
    }
    if (this.summaries().has(row.device.id)) {
      return this.i18n.t('compare.noValues');
    }
    return this.i18n.t('history.loading');
  }
}
