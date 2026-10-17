import { Component, computed, inject, input, output } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { ChartMarker, POINTER_SLACK, markersIn } from './chart-events';
import { ChartMarkers } from './chart-markers';
import { stepUnder } from './line-chart';

/**
 * The row of the timeline that marks what happened to the device, above the rows of its values:
 * alerts, times it did not answer, reboots and updates on the shared time axis, and what happened
 * in the step under the pointer in place of a value.
 */
@Component({
  selector: 'app-timeline-marks',
  imports: [ChartMarkers],
  template: `
    <!-- What happened takes the place of the label, over the label and value columns but without
      widening them, so the strips of all rows keep their width. -->
    <span class="label" [class.happened]="happened()" [title]="happened()">{{
      happened() || i18n.t('timeline.events')
    }}</span>
    <div
      class="strip marks"
      (pointermove)="hover.emit(stepAt($event))"
      (pointerleave)="hover.emit(null)"
    >
      <app-chart-markers [markers]="markers()" [from]="from()" [to]="to()" />
    </div>
  `,
  styleUrl: './timeline-row.css',
  styles: `
    .label {
      grid-column: 1 / -2;
      contain: inline-size;
    }

    .happened {
      color: var(--mat-sys-on-surface);
    }

    .strip.marks {
      grid-column: -2;
      height: 1.5rem;
    }

    @media (width < 40rem) {
      .label {
        grid-column: 1 / -1;
      }
    }
  `,
  host: { role: 'listitem' },
})
export class TimelineMarks {
  protected readonly i18n = inject(I18n);

  readonly markers = input.required<ChartMarker[]>();
  readonly from = input.required<number>();
  readonly to = input.required<number>();
  readonly step = input.required<number>();
  /** The step under the pointer in any row, or null. */
  readonly cursor = input<number | null>(null);
  readonly hover = output<number | null>();

  /** What happened in the step under the pointer; nothing while the pointer is elsewhere. */
  protected readonly happened = computed(() => {
    const cursor = this.cursor();
    return cursor === null
      ? ''
      : markersIn(this.markers(), cursor, this.step(), (this.to() - this.from()) * POINTER_SLACK)
          .map((m) => m.text)
          .join(' · ');
  });

  protected stepAt(event: PointerEvent): number {
    return stepUnder(event, this.from(), this.to(), this.step());
  }
}
