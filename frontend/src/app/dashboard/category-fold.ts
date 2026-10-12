import { Component, computed, inject, input } from '@angular/core';

import { AlertLevel } from '../alerts/alert';
import { AlertIcon } from '../alerts/alert-icon';
import { I18n } from '../i18n/i18n';
import { FoldedCategories, Section } from './categories';

/** The message of the title of each section. */
export const CATEGORY_TITLES = {
  pinned: 'categories.pinned',
  system: 'categories.system',
  storage: 'categories.storage',
  network: 'categories.network',
  temperature: 'categories.temperature',
  programs: 'categories.programs',
  other: 'categories.other',
  device: 'categories.device',
} as const satisfies Record<Section, string>;

/**
 * The title of a category of cards or charts, as a button that folds it away. Folded, it tells
 * what it holds (`count`) and shows the sign of the alerts in it. The parent puts it in a heading.
 */
@Component({
  selector: 'app-category-fold',
  imports: [AlertIcon],
  template: `
    <button
      type="button"
      class="fold"
      [attr.aria-expanded]="!folded()"
      (click)="foldedCategories.toggle(category())"
    >
      <span class="chevron" aria-hidden="true"></span>{{ i18n.t(titles[category()]) }}
      @if (folded()) {
        @if (alert(); as level) {
          <app-alert-icon [level]="level" role="img" [attr.aria-label]="i18n.t('alerts.onCard')" />
        }
        <span class="count">{{ count() }}</span>
      }
    </button>
  `,
  styleUrl: './category-fold.css',
})
export class CategoryFold {
  readonly category = input.required<Section>();
  /** What the category holds, such as "3 cards", shown while it is folded. */
  readonly count = input.required<string>();
  readonly alert = input<AlertLevel | null>(null);

  protected readonly foldedCategories = inject(FoldedCategories);
  protected readonly i18n = inject(I18n);
  protected readonly titles = CATEGORY_TITLES;
  protected readonly folded = computed(() => this.foldedCategories.folded().has(this.category()));
}
