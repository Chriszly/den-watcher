import { Component, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CardSlot } from '../dashboard/card-slot';
import { WidthIcon } from '../dashboard/width-icon';
import { I18n } from '../i18n/i18n';
import { ChartEvents } from './chart-events';
import { HistoryStore } from './history-store';
import { Chart } from './history';
import { LineChart } from './line-chart';

/**
 * The chart of one dashboard card, over the range picked at the top of the page, at the bottom of
 * the card, taller as the card is wider. Outside the arrange mode, a button in the card's corner
 * steps the card to 2 and 4 cards wide, as far as they fit, and back, until the page loads again.
 */
@Component({
  selector: 'app-card-charts',
  imports: [LineChart, WidthIcon],
  template: `
    @if (store.history(); as h) {
      @if (chart(); as chart) {
        <div class="chart">
          <app-line-chart
            [chartTitle]="chart.title"
            [lines]="chart.lines"
            [from]="h.from"
            [to]="h.to"
            [step]="h.stepSeconds"
            [unit]="chart.unit"
            [max]="chart.max"
            [markers]="events.markers()"
          />
        </div>
      }
      @if (slot; as slot) {
        @if (chart() && slot.widens() && !slot.arranging()) {
          @let label = i18n.t(slot.next() > 1 ? 'history.wider' : 'history.narrower');
          <button
            type="button"
            class="widen"
            [attr.aria-pressed]="slot.shown() > 1"
            [title]="label"
            (click)="slot.step()"
          >
            <app-width-icon [narrower]="slot.next() === 1" />
            <span class="visually-hidden">{{ label }}</span>
          </button>
        }
      }
    }
  `,
  styleUrl: './card-charts.css',
  host: { '[attr.data-width]': 'width()' },
})
export class CardCharts {
  /** The card's one chart, which merges the values it can or leaves the others to cards of their own. */
  readonly chart = input<Chart>();

  protected readonly store = inject(HistoryStore);
  /** What happened to the device, marked on the charts. */
  protected readonly events = inject(ChartEvents);
  protected readonly i18n = inject(I18n);
  /** The card's place in its grid, which sets how wide it is; none outside a grid of cards. */
  protected readonly slot = inject(CardSlot, { optional: true });
  /** How many cards wide the card shows, which sets how tall its chart is. */
  protected readonly width = computed(() => this.slot?.shown() ?? 1);

  constructor() {
    this.events.watch.pipe(takeUntilDestroyed()).subscribe();
  }
}
