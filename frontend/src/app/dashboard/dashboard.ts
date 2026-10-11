import { DecimalPipe, NgTemplateOutlet, formatDate, formatNumber } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, exhaustMap, of, switchMap, tap } from 'rxjs';

import { Alert, AlertKind, AlertLevel } from '../alerts/alert';
import { AlertIcon } from '../alerts/alert-icon';
import { alertText, worstLevel } from '../alerts/alerts';
import { HubConnection } from '../connection/connection';
import { CategoryCharts } from '../history/category-charts';
import { DeviceCharts } from '../history/history';
import { RangePicker } from '../history/range-picker';
import { Timeline, TimelineMode } from '../history/timeline';
import { Availability, DeviceService, LOCAL_DEVICE, deviceName } from '../devices/devices';
import { I18n } from '../i18n/i18n';
import { EvenColumns } from '../layout/even-columns';
import { ScrollRows } from '../layout/scroll-rows';
import { BytesPipe } from '../metrics/bytes.pipe';
import { Extra, ExtraItem, formatExtra, localized } from '../metrics/extras';
import {
  MetricsService,
  NetworkInterface,
  Snapshot,
  Temperature,
  Throttling,
  ThrottlingCondition,
  TimeZone,
} from '../metrics/metrics';
import { PageVisibility } from '../page-visibility';
import { CardInfo } from './card-info';
import { CATEGORIES, Category, FoldedCategories, extraCategory } from './categories';
import { CategoryFold } from './category-fold';
import { FitLabels } from './fit-labels';
import { Glance } from './glance';

/** How often the dashboard asks the backend for new values. */
export const REFRESH_INTERVAL_MS = 2000;

/** How often the availability of another device is read again. */
export const AVAILABILITY_REFRESH_MS = 10000;

/** The most core bars in one row; more cores are split evenly over several rows. */
const MAX_CORES_PER_ROW = 8;

/**
 * How many core bars go in one row: up to 8 stay in one row, more are split
 * evenly over as few rows as keep each at 8 or fewer (12 → 2 × 6, 20 → 7 + 7 + 6).
 */
export function coreColumns(cores: number): number {
  const rows = Math.ceil(cores / MAX_CORES_PER_ROW);
  return Math.ceil(cores / rows);
}

/** The groups of extras whose values are shown largest first, such as what each part draws. */
const LARGEST_FIRST = new Set(['power']);

/**
 * A value as the card shows it, to a tenth, so values that look the same compare equal and keep
 * their places by name instead of swapping as they wobble below what is shown.
 */
export function shown(value: number): number {
  return Math.round(value * 10);
}

/** The temperatures, hottest first; equal ones by name, so they keep their places. */
export function hottestFirst(temperatures: readonly Temperature[]): Temperature[] {
  return [...temperatures].sort(
    (a, b) => shown(b.celsius) - shown(a.celsius) || a.sensor.localeCompare(b.sensor),
  );
}

/** One section of the values of an extra: what they belong to, if anything, and the values. */
export interface ExtraSection {
  section?: string;
  items: ExtraItem[];
}

/**
 * The values of an extra as the card shows them: largest first for the groups in LARGEST_FIRST,
 * else in the order the device lists them, and the values of one section together under it, in the
 * order the sections first appear.
 */
export function extraSections(group: Extra): ExtraSection[] {
  const items = LARGEST_FIRST.has(group.id)
    ? [...group.items].sort(
        (a, b) =>
          (b.value === undefined ? -Infinity : shown(b.value)) -
            (a.value === undefined ? -Infinity : shown(a.value)) || a.id.localeCompare(b.id),
      )
    : group.items;
  const sections = new Map<string | undefined, ExtraItem[]>();
  for (const item of items) {
    const key = item.section || undefined;
    sections.set(key, [...(sections.get(key) ?? []), item]);
  }
  return [...sections].map(([section, items]) => ({ section, items }));
}

/** A card of the dashboard: one of the fixed ones, or the card of a group of extras. */
export type Card =
  | {
      id: string;
      kind:
        | 'cpu'
        | 'memory'
        | 'disks'
        | 'network'
        | 'gpus'
        | 'temperatures'
        | 'fans'
        | 'battery'
        | 'throttling'
        | 'time'
        | 'uptime';
      category: Category;
    }
  | { id: string; kind: 'extra'; category: Category; group: Extra };

/** What the alerts of each kind are shown on, besides the strip above the cards. */
const ALERT_CARDS: Partial<Record<AlertKind, string>> = {
  cpu: 'cpu',
  memory: 'memory',
  disk: 'disks',
  temperature: 'temperatures',
  throttling: 'throttling',
  smart: 'extra:smart-checks',
};

/** Why no new values arrived: the backend did not answer, or the device it collects from did not. */
type Problem = 'backend' | 'device';

/** Shows the current usage of the picked device and refreshes it every few seconds. */
@Component({
  selector: 'app-dashboard',
  imports: [
    AlertIcon,
    BytesPipe,
    CardInfo,
    CategoryCharts,
    CategoryFold,
    DecimalPipe,
    EvenColumns,
    FitLabels,
    Glance,
    NgTemplateOutlet,
    RangePicker,
    ScrollRows,
    Timeline,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly metrics = inject(MetricsService);
  private readonly devices = inject(DeviceService);
  private readonly page = inject(PageVisibility);
  /** While the hub does not answer, the banner across the page says so instead of a warning here, and the cards fade. */
  protected readonly connection = inject(HubConnection);

  protected readonly snapshot = signal<Snapshot | null>(null);
  protected readonly problem = signal<Problem | null>(null);
  protected readonly i18n = inject(I18n);
  protected readonly deviceName = computed(() => deviceName(this.devices.selected(), this.i18n));
  /** Whether the picked device is a PC or laptop, which is just not in use while it does not answer. */
  protected readonly isPC = computed(() => this.devices.selected().kind === 'pc');
  /** Whether the picked device is a router, which tells only some of what a device does. */
  protected readonly isRouter = computed(() => !!this.devices.selected().router);
  /** Whether the picked device is only checked for whether it answers, such as a printer. */
  protected readonly isChecked = computed(() => !!this.devices.selected().checked);
  /** Whether the picked device runs no Den-Watcher, so it tells only some of what a device does. */
  protected readonly readsLess = computed(() => this.isRouter() || this.isChecked());
  /** The values of the picked device that need attention now, most serious first. */
  protected readonly deviceAlerts = computed(() => this.devices.selected().alerts ?? []);
  /** Whether the backend does not connect to the picked device, as its address is the hub's own. */
  protected readonly refused = computed(() => !!this.devices.selected().refused);
  /** How long the picked device did not answer since it was added; null for this device. */
  protected readonly availability = signal<Availability | null>(null);
  /**
   * The availability the page shows: none while the device is refused, whose time without an
   * answer is not counted, so the card would claim it always answered.
   */
  protected readonly shownAvailability = computed(() =>
    this.refused() ? null : this.availability(),
  );
  private readonly charts = inject(DeviceCharts).byCategory;
  /** Whether every value shows on one timeline instead of in the categories; the mascot switches it. */
  protected readonly timeline = inject(TimelineMode);
  /**
   * The categories of the page, each with its cards and then its charts, in the order the page
   * shows them. A device that has not answered since the page opened has no cards, but it can
   * have charts up to its last reading. None while the timeline shows every value instead.
   */
  protected readonly sections = computed(() => {
    if (this.timeline.on()) {
      return [];
    }
    const s = this.snapshot();
    const cards = s ? this.cards(s) : [];
    const charts = this.charts();
    return CATEGORIES.map((category) => ({
      category,
      cards: cards.filter((card) => card.category === category),
      charts: charts.get(category)?.length ?? 0,
    })).filter((section) => section.cards.length > 0 || section.charts > 0);
  });
  protected readonly foldedCategories = inject(FoldedCategories);
  protected readonly coreColumns = coreColumns;
  protected readonly hottestFirst = hottestFirst;
  protected readonly extraSections = extraSections;

  constructor() {
    toObservable(this.devices.selectedId)
      .pipe(
        // Another device's values are not shown while the picked one's load.
        tap(() => {
          this.snapshot.set(null);
          this.problem.set(null);
        }),
        // A tick while the previous reading is still on its way is skipped, so a
        // slow backend is not asked again and again for what it has not answered.
        switchMap((device) =>
          this.page
            .ticks(REFRESH_INTERVAL_MS)
            .pipe(
              exhaustMap(() =>
                this.metrics
                  .current(device)
                  .pipe(catchError((error: unknown) => of(problemOf(error, device)))),
              ),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (typeof result === 'string') {
          this.problem.set(result);
        } else {
          this.problem.set(null);
          this.snapshot.set(result);
        }
      });

    toObservable(this.devices.selectedId)
      .pipe(
        tap(() => this.availability.set(null)),
        switchMap((device) =>
          device === LOCAL_DEVICE.id
            ? EMPTY
            : this.page
                .ticks(AVAILABILITY_REFRESH_MS)
                .pipe(
                  exhaustMap(() => this.devices.availability(device).pipe(catchError(() => EMPTY))),
                ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((availability) => this.availability.set(availability));
  }

  /** The cards the device's values fill, in the order the page shows them within a category. */
  private cards(s: Snapshot): Card[] {
    const readsLess = this.readsLess();
    const fixed = (kind: Exclude<Card['kind'], 'extra'>, category: Category, shows: unknown) =>
      shows ? [{ id: kind, kind, category }] : [];
    return [
      ...fixed('cpu', 'system', !readsLess || s.cpu.cores > 0),
      ...fixed('memory', 'system', !readsLess || s.memory.totalBytes > 0),
      ...fixed('disks', 'storage', !readsLess || s.disks.length > 0),
      ...fixed('network', 'network', !this.isChecked() || s.network.length > 0),
      ...fixed('gpus', 'system', s.gpus?.length),
      ...fixed('temperatures', 'temperature', !readsLess || s.temperatures.length > 0),
      ...fixed('fans', 'temperature', s.fans?.length),
      ...fixed('battery', 'temperature', s.battery),
      ...fixed('throttling', 'temperature', s.throttling),
      ...(s.extras ?? []).map((group): Card => ({
        id: 'extra:' + group.id,
        kind: 'extra',
        category: extraCategory(group.id),
        group,
      })),
      ...fixed('time', 'device', s.timeZone),
      ...fixed('uptime', 'device', this.showsUptime(s) || this.shownAvailability()),
    ];
  }

  /** How many cards and charts a folded category holds, for its title. */
  protected sectionCount(cards: number, charts: number): string {
    return [
      cards > 0 ? this.i18n.plural(cards, 'categories.cards.one', 'categories.cards.other') : '',
      charts > 0
        ? this.i18n.plural(charts, 'categories.charts.one', 'categories.charts.other')
        : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  /** The level of the alerts on the cards of a folded category, for the sign at its title. */
  protected categoryAlert(cards: readonly Card[]): AlertLevel | null {
    const ids = new Set(cards.map((card) => card.id));
    return worstLevel(this.deviceAlerts().filter((a) => ids.has(ALERT_CARDS[a.kind] ?? '')));
  }

  /** The level of the picked device's alerts of a kind, for the sign on its card; null for none. */
  protected alertOn(kind: AlertKind): AlertLevel | null {
    return worstLevel(this.deviceAlerts().filter((a) => a.kind === kind));
  }

  /** What the alerts of a kind are about, as the tooltip of the sign on its card. */
  protected alertTitle(kind: AlertKind): string {
    return this.deviceAlerts()
      .filter((a) => a.kind === kind)
      .map((a) => alertText(a, this.i18n))
      .join('\n');
  }

  protected alertText(alert: Alert): string {
    return alertText(alert, this.i18n);
  }

  /** Whether the device tells its uptime: a router read over UPnP may not, a check never does. */
  protected showsUptime(s: Snapshot): boolean {
    return !this.readsLess() || s.uptimeSeconds > 0;
  }

  /**
   * The share of the time the device was watched that it answered, rounded down: its
   * availability for a server, how much of the time it was in use for a PC or laptop.
   */
  protected availablePercent(a: Availability): number {
    const seconds = Math.max(1, (Date.now() - Date.parse(a.countedSince)) / 1000);
    const percent = 100 * (1 - Math.min(a.offlineSeconds, seconds) / seconds);
    return Math.floor(percent * 100) / 100;
  }

  /** The length of an outage, from its start and end as ISO times. */
  protected outageLength(outage: { start: string; end: string }): string {
    return this.formatDuration((Date.parse(outage.end) - Date.parse(outage.start)) / 1000);
  }

  /** A date and time in the page's language, from an ISO time. */
  protected when(time: string): string {
    return formatDate(time, 'short', this.i18n.language());
  }

  protected formatDuration(seconds: number): string {
    if (seconds < 60) {
      return this.i18n.t('dashboard.seconds', { seconds: Math.round(seconds) });
    }
    if (seconds < 3600) {
      return this.i18n.t('dashboard.minutes', { minutes: Math.floor(seconds / 60) });
    }
    return this.formatUptime(seconds);
  }

  /**
   * The interfaces that carried traffic since the machine started, busiest first, and how many
   * others are left out. Machines such as Windows PCs list many adapters that are never used.
   */
  protected activeInterfaces(s: Snapshot): { shown: NetworkInterface[]; idle: number } {
    const total = (n: NetworkInterface) => n.receivedBytes + n.sentBytes;
    const shown = s.network
      .filter((n) => total(n) > 0)
      .sort((a, b) => total(b) - total(a) || a.name.localeCompare(b.name));
    return { shown, idle: s.network.length - shown.length };
  }

  /** What the uptime card shows: the uptime, and how much the device answered or was in use if it tells. */
  protected uptimeInfo(a: Availability | null): string {
    const info = this.i18n.t('dashboard.info.uptime');
    return a
      ? `${info} ${this.i18n.t(a.kind === 'pc' ? 'dashboard.info.usage' : 'dashboard.info.availability')}`
      : info;
  }

  /** A title or label of an extra in the page's language. */
  protected extraText(text: string, texts?: Record<string, string>): string {
    return localized(text, texts, this.i18n.language());
  }

  /** The label of an extra in the page's language, without its section, which shows above it. */
  protected extraLabel(item: ExtraItem): string {
    const label = this.extraText(item.label, item.labels);
    const prefix = `${item.section}: `;
    return item.section && label.startsWith(prefix) ? label.slice(prefix.length) : label;
  }

  /** The value of an extra with its unit, in the page's language. */
  protected extraValue(item: ExtraItem): string {
    return item.unit === 'text' || item.value === undefined
      ? localized(item.text ?? '', item.texts, this.i18n.language())
      : formatExtra(item.value, item.unit, this.i18n.language());
  }

  /** A number in the page's language, for text parameters (the number pipe may return null). */
  protected decimal(value: number, digits: string): string {
    return formatNumber(value, this.i18n.language(), digits);
  }

  /** The addresses of an interface and the speed it is connected at, as one line. */
  protected linkDetails(n: NetworkInterface): string {
    const parts = [...(n.addresses ?? [])];
    if (n.linkMbps) {
      parts.push(
        n.linkMbps >= 1000
          ? this.i18n.t('dashboard.linkGbps', { speed: this.decimal(n.linkMbps / 1000, '1.0-1') })
          : this.i18n.t('dashboard.linkMbps', { speed: n.linkMbps }),
      );
    }
    return parts.join(' · ');
  }

  /** Describes each core's usage for screen readers, which cannot see the bars. */
  protected coresLabel(usage: number[]): string {
    const cores = usage.map((u, i) =>
      this.i18n.t('dashboard.coreUsage', { core: i + 1, usage: this.decimal(u, '1.0-0') }),
    );
    return `${this.i18n.t('dashboard.coresUsage')}: ${cores.join(', ')}`;
  }

  /** The conditions that held since the start but do not hold now. */
  protected earlierConditions(t: Throttling): ThrottlingCondition[] {
    return t.sinceBoot.filter((condition) => !t.now.includes(condition));
  }

  protected conditionList(conditions: ThrottlingCondition[]): string {
    return conditions.map((c) => this.i18n.t(`dashboard.throttling.${c}`)).join(', ');
  }

  /** The time of a reading as the device's own clock shows it, in the device's time zone. */
  protected deviceTime(time: string, zone: TimeZone, format: string): string {
    return formatDate(time, format, this.i18n.language(), offsetParts(zone.offsetSeconds).join(''));
  }

  /** The zone's name with its distance from UTC, such as "CEST (UTC+2)" or "IST (UTC+5:30)". */
  protected zoneLabel(zone: TimeZone): string {
    if (zone.offsetSeconds === 0) {
      return 'UTC';
    }
    const [sign, hours, minutes] = offsetParts(zone.offsetSeconds);
    const offset = `UTC${sign}${Number(hours)}${minutes === '00' ? '' : `:${minutes}`}`;
    // Zones without a short name are named by their offset, such as "+03".
    return /^[+-]/.test(zone.name) ? offset : `${zone.name} (${offset})`;
  }

  protected formatUptime(seconds: number): string {
    return formatUptime(seconds, this.i18n);
  }
}

/** An uptime as the page shows it: days and hours, or hours and minutes below a day. */
export function formatUptime(seconds: number, i18n: I18n): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days > 0
    ? i18n.t('dashboard.uptimeDays', { days, hours })
    : i18n.t('dashboard.uptimeHours', { hours, minutes });
}

/** The sign, hours and minutes of an offset from UTC, such as ["+", "02", "00"]. */
function offsetParts(seconds: number): [string, string, string] {
  const minutes = Math.abs(Math.round(seconds / 60));
  const pad = (n: number) => String(n).padStart(2, '0');
  return [seconds < 0 ? '-' : '+', pad(Math.floor(minutes / 60)), pad(minutes % 60)];
}

/** The backend answers 503 when a device it collects from has not answered recently. */
function problemOf(error: unknown, device: string): Problem {
  const deviceDown =
    device !== LOCAL_DEVICE.id && error instanceof HttpErrorResponse && error.status === 503;
  return deviceDown ? 'device' : 'backend';
}
