import { DatePipe, formatDate } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HubConnection } from '../connection/connection';
import { DeviceService } from '../devices/devices';
import { I18n, LanguageCode, TextParams } from '../i18n/i18n';
import { MessageKey } from '../i18n/messages/en';
import { EvenColumns } from '../layout/even-columns';
import { ExtraInfo, localized } from '../metrics/extras';
import { Point, Series } from '../metrics/metrics';
import { Category, FoldedCategories, byCategory, extraCategory } from '../dashboard/categories';
import { CategoryFold } from '../dashboard/category-fold';
import { HistoryStore } from './history-store';
import { ChartLine, ChartUnit, LineChart, dateTimeFormat, needsYear } from './line-chart';

interface Chart {
  title: string;
  category: Category;
  unit: ChartUnit;
  max?: number;
  lines: ChartLine[];
}

/**
 * Shows the machine's usage over the latest stretch of time as charts. A unit
 * (minutes, hours, days or all) and then a range of that unit pick how long
 * that stretch is, up to everything the backend keeps. For a device that is
 * not answering, the backend moves the stretch back to end at its last
 * reading, and a notice says the charts are not live.
 */
@Component({
  selector: 'app-history',
  imports: [CategoryFold, DatePipe, EvenColumns, LineChart],
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class HistoryCharts {
  private readonly devices = inject(DeviceService);
  protected readonly store = inject(HistoryStore);
  protected readonly i18n = inject(I18n);
  /** While the hub does not answer, the banner across the page says the charts are not live, and they fade. */
  protected readonly connection = inject(HubConnection);

  /** Short ranges show seconds too, and long ranges or ranges into another year the year. */
  protected readonly dateFormat = computed(() => {
    const history = this.store.history();
    const year = history !== null && needsYear(history.from, history.to);
    return this.i18n.t(dateTimeFormat(this.store.span() <= 30 * 60, year));
  });

  /** For a device that is not answering, when the shown data ends, in the page's language. */
  protected readonly lastReading = computed(() => {
    const last = this.store.history()?.lastReading;
    return last ? formatDate(last * 1000, 'short', this.i18n.language()) : null;
  });

  /** The charts by category, in the order the dashboard shows its cards. */
  protected readonly chartGroups = computed(() => byCategory(this.charts(), (c) => c.category));
  protected readonly foldedCategories = inject(FoldedCategories);
  protected readonly charts = computed(() => {
    const history = this.store.history();
    if (!history) {
      return [];
    }
    const language = this.i18n.language();
    return [
      ...chartsOf(
        history.series,
        (key, params) => this.i18n.t(key, params),
        !!this.devices.selected().router || !!this.devices.selected().checked,
      ),
      ...extraChartsOf(history.series, history.extras ?? {}, language),
    ];
  });

  constructor() {
    this.store.watch.pipe(takeUntilDestroyed()).subscribe();
  }
}

/**
 * The lines of the network chart: what all interfaces received and sent
 * together. A router passes each byte it forwards through two of its
 * interfaces, so for a router only its internet connection (WAN) is added up,
 * or, where it does not tell which interface that is, each interface gets
 * lines of its own.
 */
function networkLines(
  received: ChartLine[],
  sent: ChartLine[],
  t: (key: MessageKey, params?: TextParams) => string,
  router: boolean,
): ChartLine[] {
  if (router) {
    const wan = (lines: ChartLine[]) => lines.filter((line) => isWan(line.label));
    if (wan(received).length === 0 && wan(sent).length === 0) {
      return [
        ...received.map((line) => ({
          ...line,
          label: t('history.interfaceReceived', { name: line.label }),
        })),
        ...sent.map((line) => ({
          ...line,
          label: t('history.interfaceSent', { name: line.label }),
        })),
      ];
    }
    received = wan(received);
    sent = wan(sent);
  }
  return [
    { label: t('history.received'), points: sum(received) },
    { label: t('history.sent'), points: sum(sent) },
  ];
}

/**
 * Groups the stored metrics into charts: CPU, memory and swap, battery, GPUs,
 * temperatures, network speed, disk usage and disk activity, with titles and
 * labels in the language of t. Charts without values are left out. A router
 * read without a login tells no CPU or memory, which are kept as 0, so for a
 * router those lines are left out while they hold nothing but 0. A router's
 * network is its internet connection where it tells which one that is, as
 * its other interfaces carry the same traffic again.
 */
export function chartsOf(
  series: Series[],
  t: (key: MessageKey, params?: TextParams) => string,
  router = false,
): Chart[] {
  const named = (kind: string) => linesOf(series, kind);
  const metric = (name: string) => {
    const points = pointsOf(series, name);
    const untold =
      router && (name === 'cpu' || name === 'memory') && points.every((p) => p.value === 0);
    return untold ? [] : points;
  };

  const charts: Chart[] = [
    {
      title: t('history.cpuAndMemory'),
      category: 'system',
      unit: 'percent',
      max: 100,
      lines: [
        { label: t('history.cpu'), points: metric('cpu') },
        { label: t('history.memory'), points: metric('memory') },
        // Machines without swap space have no swap line.
        ...(metric('swap').length > 0
          ? [{ label: t('history.swap'), points: metric('swap') }]
          : []),
      ],
    },
    {
      title: t('history.battery'),
      category: 'temperature',
      unit: 'percent',
      max: 100,
      lines: [{ label: t('history.charge'), points: metric('battery') }],
    },
    {
      title: t('history.gpu'),
      category: 'system',
      unit: 'percent',
      max: 100,
      lines: [
        ...named('gpu'),
        ...named('gpu.memory').map((line) => ({
          ...line,
          label: t('history.gpuMemory', { name: line.label }),
        })),
      ],
    },
    {
      title: t('history.temperature'),
      category: 'temperature',
      unit: 'celsius',
      lines: named('temperature'),
    },
    {
      title: t('history.network'),
      category: 'network',
      unit: 'bytesPerSecond',
      lines: networkLines(named('network.receive'), named('network.send'), t, router),
    },
    {
      title: t('history.disks'),
      category: 'storage',
      unit: 'percent',
      max: 100,
      lines: named('disk'),
    },
    {
      title: t('history.diskActivity'),
      category: 'storage',
      unit: 'bytesPerSecond',
      lines: [
        ...named('disk.read').map((line) => ({
          ...line,
          label: t('history.diskRead', { path: line.label }),
        })),
        ...named('disk.write').map((line) => ({
          ...line,
          label: t('history.diskWritten', { path: line.label }),
        })),
      ],
    },
  ];
  return charts.filter((chart) => chart.lines.some((line) => line.points.length > 0));
}

/**
 * Draws the extras: one chart per group and unit, titled and labelled as the
 * device describes them, in the page's language. Series without a description
 * are left out.
 */
export function extraChartsOf(
  series: Series[],
  extras: Record<string, ExtraInfo>,
  language: LanguageCode,
): Chart[] {
  const charts = new Map<string, Chart>();
  for (const s of series) {
    const info = extras[s.metric];
    if (!info || info.unit === 'text' || s.points.length === 0) {
      continue;
    }
    const group = s.metric.slice(0, s.metric.indexOf('/'));
    const key = `${group} ${info.unit}`;
    let chart = charts.get(key);
    if (!chart) {
      chart = {
        title: localized(info.title, info.titles, language),
        category: extraCategory(group.slice('extra:'.length)),
        unit: info.unit,
        max: info.unit === 'percent' ? 100 : undefined,
        lines: [],
      };
      charts.set(key, chart);
    }
    chart.lines.push({ label: localized(info.label, info.labels, language), points: s.points });
  }
  // A chart of one line has no legend, so its title names the value.
  return [...charts.values()].map((chart) =>
    chart.lines.length === 1
      ? { ...chart, title: `${chart.title} · ${chart.lines[0].label}` }
      : chart,
  );
}

/** Whether a router's interface is its internet connection: "WAN", or "WAN 2" for a second one. */
export function isWan(name: string): boolean {
  return name === 'WAN' || name.startsWith('WAN ');
}

/** The points of one metric, such as "cpu"; none when it is not stored. */
export function pointsOf(series: Series[], name: string): Point[] {
  return series.find((s) => s.metric === name)?.points ?? [];
}

/** The lines of a kind of metric, such as every network card's received bytes, labelled by name. */
export function linesOf(series: Series[], kind: string): ChartLine[] {
  return series
    .filter((s) => s.metric.startsWith(kind + ':'))
    .map((s) => ({ label: s.metric.slice(kind.length + 1), points: s.points }));
}

/** Adds up the values of several lines at each time, such as the traffic of all network cards. */
export function sum(lines: ChartLine[]): Point[] {
  const totals = new Map<number, number>();
  for (const line of lines) {
    for (const point of line.points) {
      totals.set(point.time, (totals.get(point.time) ?? 0) + point.value);
    }
  }
  return [...totals].map(([time, value]) => ({ time, value })).sort((a, b) => a.time - b.time);
}
