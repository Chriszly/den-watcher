import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, exhaustMap, forkJoin, map, of, switchMap } from 'rxjs';

import { AlertLevel } from '../alerts/alert';
import { AlertIcon } from '../alerts/alert-icon';
import { worstLevel } from '../alerts/alerts';
import { HubConnection } from '../connection/connection';
import { formatUptime } from '../dashboard/dashboard';
import { Device, DeviceService, deviceName, notInUse } from '../devices/devices';
import { I18n } from '../i18n/i18n';
import { MessageKey } from '../i18n/messages/en';
import { EvenColumns } from '../layout/even-columns';
import { BytesPipe } from '../metrics/bytes.pipe';
import { History, MetricsService, Point, Series, Snapshot } from '../metrics/metrics';
import { PageVisibility } from '../page-visibility';
import { refreshIntervalMs } from '../history/history';
import { ChartLine, ChartUnit, LineChart } from '../history/line-chart';

/** How often the current values of all devices are read again, as often as the hub reads them. */
export const COMPARE_REFRESH_MS = 5000;

/** The main values of one device, to compare; a value the device does not report is missing. */
export interface Summary {
  cpu?: number;
  memory?: number;
  /** The fullest disk. */
  disk?: { path: string; percent: number };
  /** The hottest sensor. */
  temperature?: { sensor: string; celsius: number };
  /** All network cards together, in bytes per second. */
  network?: { receive: number; send: number };
  uptimeSeconds?: number;
}

/** The main values of a snapshot. A router or a check reports only some, the others are missing. */
export function summarize(s: Snapshot): Summary {
  const fullest = [...s.disks].sort((a, b) => b.usedPercent - a.usedPercent)[0];
  const hottest = [...s.temperatures].sort((a, b) => b.celsius - a.celsius)[0];
  return {
    cpu: s.cpu.cores > 0 ? s.cpu.usagePercent : undefined,
    memory: s.memory.totalBytes > 0 ? s.memory.usedPercent : undefined,
    disk: fullest && { path: fullest.path, percent: fullest.usedPercent },
    temperature: hottest && { sensor: hottest.sensor, celsius: hottest.celsius },
    network:
      s.network.length > 0
        ? {
            receive: s.network.reduce((sum, n) => sum + n.receiveBytesPerSecond, 0),
            send: s.network.reduce((sum, n) => sum + n.sendBytesPerSecond, 0),
          }
        : undefined,
    uptimeSeconds: s.uptimeSeconds > 0 ? s.uptimeSeconds : undefined,
  };
}

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
  /** The device's line, from its history. */
  points: (series: Series[]) => Point[];
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
function metric(series: Series[], name: string): Point[] {
  const points = series.find((s) => s.metric === name)?.points ?? [];
  return points.every((p) => p.value === 0) ? [] : points;
}

const CHARTS: CompareChart[] = [
  { title: 'compare.cpu', unit: 'percent', max: 100, points: (s) => metric(s, 'cpu') },
  { title: 'compare.memory', unit: 'percent', max: 100, points: (s) => metric(s, 'memory') },
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
  imports: [AlertIcon, BytesPipe, DecimalPipe, EvenColumns, LineChart],
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
  protected readonly ranges = RANGES;
  protected readonly sortedBy = signal<Column | null>(null);
  protected readonly range = signal(RANGES[2]);

  /** The values of each device read; null for one whose values could not be read. */
  private readonly summaries = signal<ReadonlyMap<string, Summary | null>>(new Map());
  protected readonly rows = computed(() =>
    sortRows(
      this.devices.devices().map((device) => ({
        device,
        summary: this.summaries().get(device.id) ?? null,
      })),
      this.sortedBy(),
    ),
  );

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
          points: chart.points(history.series),
        }))
        .filter((line) => line.points.length > 0),
    })).filter((chart) => chart.lines.length > 0);
  });
  protected readonly chartRange = computed(() => this.histories());

  constructor() {
    this.page
      .ticks(COMPARE_REFRESH_MS)
      .pipe(
        exhaustMap(() => this.readSummaries()),
        takeUntilDestroyed(),
      )
      .subscribe((summaries) => this.summaries.set(summaries));

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

  /** The values of every device that answers; the hub does not ask for those of one that does not. */
  private readSummaries(): Observable<Map<string, Summary | null>> {
    const answering = this.devices.devices().filter((d) => !d.unreachable);
    if (answering.length === 0) {
      return of(new Map());
    }
    return forkJoin(
      answering.map((d) =>
        this.metrics.current(d.id).pipe(
          map((s): [string, Summary | null] => [d.id, summarize(s)]),
          catchError(() => of<[string, null]>([d.id, null])),
        ),
      ),
    ).pipe(map((entries) => new Map(entries)));
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

  /** Shows one device on its own, as when its button above is picked. */
  protected open(device: Device): void {
    this.devices.selectedId.set(device.id);
    this.devices.comparing.set(false);
  }

  protected deviceName(device: Device): string {
    return deviceName(device, this.i18n);
  }

  /** The dot before the name, as on the device's button above. */
  protected state(device: Device): 'reachable' | 'unreachable' | 'notInUse' {
    if (!device.unreachable) {
      return 'reachable';
    }
    return notInUse(device) ? 'notInUse' : 'unreachable';
  }

  protected alertLevel(device: Device): AlertLevel | null {
    return worstLevel(device.alerts ?? []);
  }

  protected uptime(seconds: number): string {
    return formatUptime(seconds, this.i18n);
  }

  /** Why a row has no values: the device does not answer, or its values are on their way. */
  protected noValues(row: Row): string {
    if (row.device.unreachable) {
      return this.i18n.t(notInUse(row.device) ? 'devices.notInUse' : 'devices.unreachable');
    }
    if (this.summaries().has(row.device.id)) {
      return this.i18n.t('devices.unreachable');
    }
    return this.i18n.t('history.loading');
  }
}
