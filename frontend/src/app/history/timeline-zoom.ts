import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

import { DeviceService } from '../devices/devices';
import { History, MetricsService } from '../metrics/metrics';
import { HistoryStore } from './history-store';

/** A stretch of time, from `from` to `to` in Unix seconds. */
export interface Stretch {
  from: number;
  to: number;
}

/** The shortest stretch the timeline zooms into, in seconds. */
export const MIN_ZOOM_SECONDS = 60;

/**
 * The stretches the timeline is zoomed into, each within the one before, and the history of the
 * latest. The backend reads a shorter stretch in finer steps, so zooming in shows more detail.
 * Picking another range or device shows the whole range again.
 */
@Injectable()
export class TimelineZoom {
  private readonly metrics = inject(MetricsService);
  private readonly devices = inject(DeviceService);
  private readonly store = inject(HistoryStore);

  /** The stretches zoomed into, the latest last; empty while the whole range shows. */
  readonly trail = signal<Stretch[]>([]);

  /** The stretch shown, or null for the whole range. */
  readonly stretch = computed(() => this.trail().at(-1) ?? null);

  /**
   * The history of a stretch zoomed into: the latest read, which may still be of the stretch before
   * while the new one loads; null while the whole range shows, or when the stretch could not be read.
   */
  readonly history = signal<History | null>(null);

  constructor() {
    effect(() => {
      this.store.span();
      this.devices.selectedId();
      untracked(() => this.trail.set([]));
    });
    toObservable(computed(() => ({ stretch: this.stretch(), device: this.devices.selectedId() })))
      .pipe(
        switchMap(({ stretch, device }) =>
          stretch
            ? this.metrics
                .history(stretch.from, stretch.to, device)
                .pipe(catchError(() => of(null)))
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((history) => this.history.set(history));
  }

  /** Zooms into a stretch of the one shown; one shorter than a minute grows to a minute. */
  zoomIn(stretch: Stretch): void {
    this.trail.update((trail) => [...trail, this.fit(stretch)]);
  }

  /** Shows another stretch in place of the one shown, as when the window is moved. */
  move(stretch: Stretch): void {
    this.trail.update((trail) => [...trail.slice(0, -1), this.fit(stretch)]);
  }

  /** Goes back to the stretch before; `steps` back, or to the whole range with all of them. */
  back(steps = 1): void {
    this.trail.update((trail) => trail.slice(0, Math.max(0, trail.length - steps)));
  }

  /** Keeps the stretch within the whole range and at least a minute long. */
  private fit({ from, to }: Stretch): Stretch {
    const whole = this.store.history();
    const start = whole?.from ?? from;
    const end = whole?.to ?? to;
    const length = Math.min(Math.max(to - from, MIN_ZOOM_SECONDS), end - start);
    const middle = (from + to) / 2;
    const fitted = Math.min(Math.max(middle - length / 2, start), end - length);
    return { from: Math.round(fitted), to: Math.round(fitted + length) };
  }
}
