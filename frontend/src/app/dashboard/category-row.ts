import { Component, inject, input, output } from '@angular/core';

import { AlertLevel } from '../alerts/alert';
import { AlertIcon } from '../alerts/alert-icon';
import { HistoryStore } from '../history/history-store';
import { Sparkline } from '../history/sparkline';
import { I18n } from '../i18n/i18n';
import { CATEGORY_TITLES } from './category-fold';
import { Category } from './categories';
import { RowKey } from './row-keys';

/**
 * The head of a category in the rows view: its title with the sign of its alerts and what it
 * holds, then its main values with a small chart each, as one button that opens the category's
 * cards below it. Every row has this shape, so the closed page reads as one even list.
 */
@Component({
  selector: 'app-category-row',
  imports: [AlertIcon, Sparkline],
  template: `
    @let h = store.history();
    <button type="button" class="head" [attr.aria-expanded]="open()" (click)="opened.emit()">
      <span class="name">
        <span class="title">
          {{ i18n.t(titles[category()]) }}
          @if (alert(); as level) {
            <app-alert-icon
              [level]="level"
              role="img"
              [attr.aria-label]="i18n.t('alerts.onCard')"
            />
          }
        </span>
        <span class="count">{{ count() }}</span>
      </span>
      <span class="keys">
        @for (key of keys(); track key.label) {
          <span class="key">
            <span class="label">{{ key.label }}</span>
            <span class="value"
              >{{ key.value }}<span class="unit">{{ key.unit }}</span></span
            >
            @if (h && key.points.length > 0) {
              <app-sparkline
                [points]="key.points"
                [from]="h.from"
                [to]="h.to"
                [step]="h.stepSeconds"
                [unit]="key.chartUnit"
                [max]="key.max"
                [series]="key.series"
              />
            }
          </span>
        }
      </span>
      <span class="chevron" aria-hidden="true"></span>
    </button>
  `,
  styleUrl: './category-row.css',
})
export class CategoryRow {
  readonly category = input.required<Category>();
  readonly keys = input.required<RowKey[]>();
  /** What the category holds, such as "3 cards · 20 values". */
  readonly count = input.required<string>();
  readonly alert = input<AlertLevel | null>(null);
  readonly open = input(false);
  /** Emitted on a click, which opens the row or, when it is open, closes it. */
  readonly opened = output();

  protected readonly store = inject(HistoryStore);
  protected readonly i18n = inject(I18n);
  protected readonly titles = CATEGORY_TITLES;
}
