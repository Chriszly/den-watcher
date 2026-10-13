import { Component, computed, inject, input, output } from '@angular/core';

import { HistoryStore } from '../history/history-store';
import { Sparkline } from '../history/sparkline';
import { I18n } from '../i18n/i18n';
import { Extra, ExtraItem, formatExtra, localized } from '../metrics/extras';
import { Point } from '../metrics/metrics';
import { Arrangement } from './arrangement';
import { valueCard } from './categories';

/**
 * The extras groups for experts of one category, such as the kernel's counters, folded into one
 * table: a small table per group, each value a row with its name, the value now and, where the hub
 * keeps its history, a small chart of it over the range picked at the top of the page. While the
 * page is arranged, each row has a button to make the value a card of its own.
 */
@Component({
  selector: 'app-details',
  imports: [Sparkline],
  template: `
    <details>
      <summary>
        {{ i18n.t('details.title') }}
        <span class="count">{{ count() }}</span>
      </summary>
      <div class="groups">
        @let h = store.history();
        @let arranging = arrangement.arranging();
        @for (group of groups(); track group.id) {
          <table>
            <caption>
              {{
                text(group.title, group.titles)
              }}
            </caption>
            @for (item of group.items; track item.id) {
              @let points = pointsByMetric().get(metric(group, item)) ?? [];
              <tr>
                <th scope="row">{{ text(item.label, item.labels) }}</th>
                <td class="value">{{ value(item) }}</td>
                <td class="history">
                  @if (h && item.unit !== 'text' && points.length > 0) {
                    <app-sparkline
                      [points]="points"
                      [from]="h.from"
                      [to]="h.to"
                      [step]="h.stepSeconds"
                      [unit]="item.unit"
                      [max]="item.unit === 'percent' ? 100 : undefined"
                    />
                  }
                </td>
                @if (arranging) {
                  @let card = valueCard(group.id, item.id);
                  <td class="arrange">
                    <button
                      type="button"
                      class="make"
                      [attr.data-card]="card"
                      [attr.aria-label]="
                        i18n.t('arrange.make', { value: text(item.label, item.labels) })
                      "
                      [title]="i18n.t('arrange.make', { value: text(item.label, item.labels) })"
                      (click)="make.emit(card)"
                    >
                      <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </td>
                }
              </tr>
            }
          </table>
        }
      </div>
    </details>
  `,
  styleUrl: './details.css',
})
export class Details {
  readonly groups = input.required<Extra[]>();
  /** Asks to make a value a card of its own, by the card's id. */
  readonly make = output<string>();

  protected readonly store = inject(HistoryStore);
  protected readonly i18n = inject(I18n);
  protected readonly arrangement = inject(Arrangement);
  protected readonly valueCard = valueCard;
  /** The stored history of each metric, looked up once per reading rather than once per row. */
  protected readonly pointsByMetric = computed(
    () =>
      new Map<string, Point[]>(
        (this.store.history()?.series ?? []).map((s) => [s.metric, s.points]),
      ),
  );

  protected readonly count = computed(() =>
    this.i18n.plural(
      this.groups().reduce((sum, group) => sum + group.items.length, 0),
      'details.values.one',
      'details.values.other',
    ),
  );

  /** The stored metric of an extra, as the hub names it. */
  protected metric(group: Extra, item: ExtraItem): string {
    return `extra:${group.id}/${item.id}`;
  }

  protected text(text: string, texts?: Record<string, string>): string {
    return localized(text, texts, this.i18n.language());
  }

  /** The value of an extra with its unit, in the page's language. */
  protected value(item: ExtraItem): string {
    return item.unit === 'text' || item.value === undefined
      ? localized(item.text ?? '', item.texts, this.i18n.language())
      : formatExtra(item.value, item.unit, this.i18n.language());
  }
}
