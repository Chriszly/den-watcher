import { Component, inject, input } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { Arrangement } from './arrangement';

/** A card the page does not show, by its id and title. */
export interface HiddenCard {
  id: string;
  title: string;
}

/** While the page is arranged, the hidden cards of a category, each a chip that shows it again. */
@Component({
  selector: 'app-hidden-cards',
  template: `
    <span>{{ i18n.t('arrange.hidden', { category: category() }) }}</span>
    @for (card of cards(); track card.id) {
      <button
        type="button"
        [attr.data-card]="card.id"
        (click)="arrangement.show(card.id)"
        [attr.aria-label]="i18n.t('arrange.show', { card: card.title })"
        [title]="i18n.t('arrange.show', { card: card.title })"
      >
        {{ card.title }}
      </button>
    }
  `,
  styleUrl: './hidden-cards.css',
})
export class HiddenCards {
  /** The title of the category. */
  readonly category = input.required<string>();
  readonly cards = input.required<readonly HiddenCard[]>();

  protected readonly arrangement = inject(Arrangement);
  protected readonly i18n = inject(I18n);
}
