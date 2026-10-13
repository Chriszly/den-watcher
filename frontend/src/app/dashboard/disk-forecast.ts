import { Component, Injectable, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  catchError,
  exhaustMap,
  filter,
  map,
  share,
  switchMap,
  tap,
} from 'rxjs';

import { AlertIcon } from '../alerts/alert-icon';
import { DeviceService } from '../devices/devices';
import { I18n } from '../i18n/i18n';
import { History, MetricsService, Point } from '../metrics/metrics';
import { PageVisibility } from '../page-visibility';

/** How far back the rise of a disk is measured. */
export const FORECAST_DAYS = 7;

/** How often a device's history is read again for the forecast. */
export const FORECAST_REFRESH_MS = 3600_000;

/** How often the page checks whether a device's forecast is due to be read again. */
const CHECK_MS = 60_000;

/** The least time the history must cover before a forecast is made, in seconds. */
const LEAST_SPAN = 86400;

/**
 * How closely the usage must follow a straight line (R², from 0 to 1) to count as rising steadily,
 * so one large copy on an otherwise even disk forecasts nothing.
 */
const LEAST_FIT = 0.5;

/** Forecasts further away than this are left out. */
const MOST_DAYS = 365;

/** A forecast closer than this many days shows as a warning. */
export const SOON_DAYS = 14;

/**
 * How many percentage points a day the usage rose over the points, by a straight line fitted
 * through them, or null when they cover less than a day, do not rise, or rise unsteadily.
 */
export function risePerDay(points: readonly Point[]): number | null {
  if (points.length < 3 || points[points.length - 1].time - points[0].time < LEAST_SPAN) {
    return null;
  }
  const n = points.length;
  const meanTime = points.reduce((sum, p) => sum + p.time, 0) / n;
  const meanValue = points.reduce((sum, p) => sum + p.value, 0) / n;
  let times = 0;
  let values = 0;
  let both = 0;
  for (const p of points) {
    times += (p.time - meanTime) ** 2;
    values += (p.value - meanValue) ** 2;
    both += (p.time - meanTime) * (p.value - meanValue);
  }
  if (both <= 0 || values === 0) {
    return null;
  }
  const fit = (both * both) / (times * values);
  return fit >= LEAST_FIT ? (both / times) * 86400 : null;
}

/**
 * In how many days a disk used percent full is full when it keeps rising by perDay percentage
 * points a day; null when it is full already or would take more than a year.
 */
export function daysUntilFull(perDay: number, percent: number): number | null {
  if (perDay <= 0 || percent >= 100) {
    return null;
  }
  const days = (100 - percent) / perDay;
  return days <= MOST_DAYS ? days : null;
}

/**
 * How fast each disk of a history rises, by its path, for the disks that rise steadily. A device
 * that does not answer gets none, as its disks may have changed since its last reading.
 */
export function risesOf(history: History): Map<string, number> {
  const rises = new Map<string, number>();
  if (history.lastReading) {
    return rises;
  }
  for (const series of history.series) {
    if (series.metric.startsWith('disk:')) {
      const rise = risePerDay(series.points);
      if (rise !== null) {
        rises.set(series.metric.slice('disk:'.length), rise);
      }
    }
  }
  return rises;
}

/** The rises of a device's disks, and when they were read, in milliseconds. */
interface Read {
  at: number;
  rises: Map<string, number>;
}

/**
 * How fast the disks of the picked device fill up, measured over the last 7 days of its history.
 * The history is read only while something watches, and at most once an hour for each device, as
 * a disk fills over days and the week's history is the largest answer the backend gives.
 */
@Injectable({ providedIn: 'root' })
export class DiskForecasts {
  private readonly metrics = inject(MetricsService);
  private readonly devices = inject(DeviceService);
  private readonly page = inject(PageVisibility);

  private readonly reads = signal<ReadonlyMap<string, Read>>(new Map());

  /** How many percentage points a day each disk of the picked device rises, by its path. */
  readonly rises = computed(
    () => this.reads().get(this.devices.selectedId())?.rises ?? new Map<string, number>(),
  );

  /** Reads the picked device's history while subscribed to, when its forecast is due. */
  readonly watch: Observable<unknown> = toObservable(this.devices.selectedId).pipe(
    switchMap((device) =>
      this.page.ticks(CHECK_MS).pipe(
        filter(
          () => Date.now() - (this.reads().get(device)?.at ?? -Infinity) >= FORECAST_REFRESH_MS,
        ),
        exhaustMap(() => {
          const to = Math.floor(Date.now() / 1000);
          return this.metrics.history(to - FORECAST_DAYS * 86400, to, device).pipe(
            map(risesOf),
            // A failed read is tried again at the next check.
            catchError(() => EMPTY),
            tap((rises) =>
              this.reads.update((reads) => new Map(reads).set(device, { at: Date.now(), rises })),
            ),
          );
        }),
      ),
    ),
    share(),
  );
}

/**
 * "Full in about N days" under a disk that fills up steadily, as a warning when that is less than
 * two weeks away; nothing for any other disk.
 */
@Component({
  selector: 'app-disk-forecast',
  imports: [AlertIcon],
  template: `
    @if (days(); as days) {
      <p class="detail" [class.soon]="days < soonDays">
        @if (days < soonDays) {
          <app-alert-icon level="warning" />
        }
        {{ i18n.plural(rounded(days), 'dashboard.diskFull.one', 'dashboard.diskFull.other') }}
      </p>
    }
  `,
  styles: `
    p {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin: 0.25rem 0 0;
      color: var(--mat-sys-on-surface-variant);
      --alert-icon-size: 1rem;
    }

    .soon {
      color: light-dark(#8a5200, #f0a030);
    }
  `,
})
export class DiskForecast {
  readonly path = input.required<string>();
  /** How full the disk is now, in percent. */
  readonly percent = input.required<number>();

  protected readonly i18n = inject(I18n);
  private readonly forecasts = inject(DiskForecasts);
  protected readonly soonDays = SOON_DAYS;

  protected readonly days = computed(() => {
    const rise = this.forecasts.rises().get(this.path());
    return rise === undefined ? null : daysUntilFull(rise, this.percent());
  });

  constructor() {
    this.forecasts.watch.pipe(takeUntilDestroyed()).subscribe();
  }

  /** Whole days, and at least one, as "about" a fraction of a day says nothing more. */
  protected rounded(days: number): number {
    return Math.max(1, Math.round(days));
  }
}
