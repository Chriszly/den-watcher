import { Component, computed, inject, input, output } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { formatExtra } from '../metrics/extras';
import { Point } from '../metrics/metrics';
import { ChartUnit, stepUnder } from './line-chart';
import { Sparkline } from './sparkline';

/** One value of the timeline, such as the CPU usage or one disk's fill. */
export interface TimelineLine {
  label: string;
  unit: ChartUnit;
  points: Point[];
  /** The color of its strip, by its place in the charts' palette. */
  series: number;
}

/**
 * One row of the timeline: what the value is, the value at the time under the pointer or else its
 * latest, and a strip of it over the shared time axis. Moving the pointer over the strip reports
 * the step under it, so every row shows its value at that time.
 */
@Component({
  selector: 'app-timeline-row',
  imports: [Sparkline],
  template: `
    <span class="label" [title]="line().label">{{ line().label }}</span>
    <span class="value">{{ value() }}</span>
    <app-sparkline
      class="strip"
      [points]="line().points"
      [from]="from()"
      [to]="to()"
      [step]="step()"
      [unit]="line().unit"
      [series]="line().series"
      (pointermove)="hover.emit(stepAt($event))"
      (pointerleave)="hover.emit(null)"
    />
  `,
  styleUrl: './timeline-row.css',
  host: { role: 'listitem' },
})
export class TimelineRow {
  private readonly i18n = inject(I18n);

  readonly line = input.required<TimelineLine>();
  readonly from = input.required<number>();
  readonly to = input.required<number>();
  readonly step = input.required<number>();
  /** The step under the pointer in any row, or null to show the latest value. */
  readonly cursor = input<number | null>(null);
  readonly hover = output<number | null>();

  protected readonly value = computed(() => {
    const cursor = this.cursor();
    const points = this.line().points;
    const point = cursor === null ? points.at(-1) : points.find((p) => p.time === cursor);
    return point ? formatExtra(point.value, this.line().unit, this.i18n.language()) : '–';
  });

  protected stepAt(event: PointerEvent): number {
    return stepUnder(event, this.from(), this.to(), this.step());
  }
}
