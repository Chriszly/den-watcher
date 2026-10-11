import { Component, computed, input } from '@angular/core';

import { Point } from '../metrics/metrics';
import { ChartUnit, chartTop, linePath } from './line-chart';

/**
 * A small chart of one value over time, without axes or labels, from `from` to `to` (Unix seconds)
 * with one point per `step` seconds; the value next to it says what it is. Its color is a place in
 * the charts' palette (`series`).
 */
@Component({
  selector: 'app-sparkline',
  template: `
    <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      height: 3rem;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    path {
      fill: none;
      stroke: var(--color);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
  `,
  host: { '[class]': "'series-' + series()" },
})
export class Sparkline {
  readonly points = input.required<Point[]>();
  readonly from = input.required<number>();
  readonly to = input.required<number>();
  readonly step = input.required<number>();
  readonly unit = input.required<ChartUnit>();
  /** The top of the chart; when not set, it fits the highest value. */
  readonly max = input<number>();
  /** The color of the line, by its place in the palette. */
  readonly series = input(0);

  protected readonly path = computed(() => {
    const points = this.points();
    const top = chartTop([{ label: '', points }], this.unit(), this.max());
    return linePath(points, this.from(), this.to(), this.step(), top);
  });
}
