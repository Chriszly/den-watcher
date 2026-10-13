import { Component, computed, input } from '@angular/core';

import { ChartMarker, placeMarkers } from './chart-events';

/**
 * The marks of a device's events over a chart or strip from `from` to `to` (Unix seconds): a thin
 * line for a moment, colored by what happened, and a faint band for a time the device did not
 * answer. They take no pointer, so the chart below shows what happened in its readout.
 */
@Component({
  selector: 'app-chart-markers',
  template: `
    @for (m of placed(); track $index) {
      <span
        [class]="'marker ' + m.kind + (m.level === 'warning' ? ' warning' : '')"
        [class.band]="m.width !== undefined"
        [style.left.%]="m.left"
        [style.width.%]="m.width"
      ></span>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .marker {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 0;
      border-left: 1px solid var(--marker);
      opacity: 0.9;
    }

    /* A small dot at the top tells the line from the chart's own lines. */
    .marker:not(.band)::before {
      content: '';
      position: absolute;
      top: 0;
      left: -3.5px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--marker);
    }

    .band {
      border-left: 0;
      background: color-mix(in srgb, var(--mat-sys-on-surface) 8%, transparent);
      opacity: 1;
    }

    .alert,
    .alertEnded {
      --marker: var(--alert-level);
    }

    .warning {
      --marker: var(--warning-level);
    }

    .alertEnded {
      border-left-style: dashed;
    }

    .alertEnded::before {
      background: transparent;
      box-shadow: inset 0 0 0 1px var(--marker);
    }

    .reboot {
      --marker: var(--mat-sys-primary);
    }

    .update {
      --marker: var(--mat-sys-tertiary);
    }

    @media (forced-colors: active) {
      .marker {
        --marker: CanvasText;
      }
    }
  `,
})
export class ChartMarkers {
  readonly markers = input.required<ChartMarker[]>();
  readonly from = input.required<number>();
  readonly to = input.required<number>();

  protected readonly placed = computed(() => placeMarkers(this.markers(), this.from(), this.to()));
}
