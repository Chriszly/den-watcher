import { Component, inject, input, signal } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { HistoryStore } from './history-store';
import { Chart } from './history';
import { LineChart } from './line-chart';

/**
 * The charts of one dashboard card, over the range picked at the top of the page, small at the
 * bottom of the card. A button in the card's corner widens the card over its row, with taller
 * charts, and narrows it again.
 */
@Component({
  selector: 'app-card-charts',
  imports: [LineChart],
  template: `
    @if (store.history(); as h) {
      @for (chart of charts(); track $index) {
        <div class="chart">
          @if (charts().length > 1) {
            <h4>{{ chart.part ?? chart.title }}</h4>
          }
          <app-line-chart
            [chartTitle]="chart.title"
            [lines]="chart.lines"
            [from]="h.from"
            [to]="h.to"
            [step]="h.stepSeconds"
            [unit]="chart.unit"
            [max]="chart.max"
          />
        </div>
      }
      @if (charts().length > 0) {
        <button
          type="button"
          class="widen"
          [attr.aria-pressed]="wide()"
          [title]="i18n.t('history.bigger')"
          (click)="wide.update((wide) => !wide)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5" />
          </svg>
          <span class="visually-hidden">{{ i18n.t('history.bigger') }}</span>
        </button>
      }
    }
  `,
  styleUrl: './card-charts.css',
  host: { '[class.wide]': 'wide()' },
})
export class CardCharts {
  readonly charts = input.required<Chart[]>();

  protected readonly store = inject(HistoryStore);
  protected readonly i18n = inject(I18n);
  /** Whether the card is widened over its row, with taller charts. */
  protected readonly wide = signal(false);
}
