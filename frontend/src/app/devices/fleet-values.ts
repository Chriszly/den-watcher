import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, exhaustMap, forkJoin, map, of, share, tap } from 'rxjs';

import { MetricsService } from '../metrics/metrics';
import { Summary, summarize } from '../metrics/summary';
import { PageVisibility } from '../page-visibility';
import { DeviceService } from './devices';

/** How often the current values of all devices are read again, as often as the hub reads them. */
export const FLEET_REFRESH_MS = 5000;

/**
 * The main values of every device now, for the list of devices and the comparison. They are read
 * only while something watches them, and once for all watchers.
 */
@Injectable({ providedIn: 'root' })
export class FleetValues {
  private readonly metrics = inject(MetricsService);
  private readonly devices = inject(DeviceService);

  /** The values of each device read; null for one whose values could not be read. */
  readonly summaries = signal<ReadonlyMap<string, Summary | null>>(new Map());

  /** Reads the values while it is subscribed to; any number of watchers share one read. */
  readonly watch: Observable<unknown> = inject(PageVisibility)
    .ticks(FLEET_REFRESH_MS)
    .pipe(
      exhaustMap(() => this.read()),
      tap((summaries) => this.summaries.set(summaries)),
      share(),
    );

  /** The values of every device that answers; the hub does not ask for those of one that does not. */
  private read(): Observable<Map<string, Summary | null>> {
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
}
