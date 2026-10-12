import { Directive, computed, inject, input } from '@angular/core';

import { EvenColumns } from '../layout/even-columns';
import { Arrangement } from './arrangement';
import { CARD_WIDTHS, CardWidths } from './card-widths';

/**
 * The place of a card in its category's grid, as many cards wide as it is set, but no wider than
 * the grid's columns. The card's buttons step it through the widths that fit side by side.
 */
@Directive({
  selector: '[appCardSlot]',
  host: {
    '[attr.data-width]': 'width()',
    '[style.grid-column]': "shown() > 1 ? 'span ' + shown() : null",
  },
})
export class CardSlot {
  /** The id of the card. */
  readonly card = input.required<string>({ alias: 'appCardSlot' });

  private readonly widths = inject(CardWidths);
  /** Whether the page is being arranged, where a width is set for every browser. */
  readonly arranging = inject(Arrangement).arranging;
  private readonly grid = inject(EvenColumns, { optional: true });
  /** How many cards wide the card is set; while arranging, as kept on the host for every browser. */
  readonly width = computed(() => this.widths.width(this.card(), this.arranging()));
  /** How many cards wide the card shows: as set, but no wider than the grid. */
  readonly shown = computed(() => Math.min(this.width(), this.grid?.columns() ?? 1));
  /** Whether the grid has room for the card to be wider than one card. */
  readonly widens = computed(() => (this.grid?.fit() ?? 1) >= CARD_WIDTHS[1]);
  /** The width a step goes to: the next wider one that fits side by side, else one card again. */
  readonly next = computed(() => {
    const fit = this.grid?.fit() ?? 1;
    const width = Math.min(this.width(), fit);
    return CARD_WIDTHS.find((w) => w > width && w <= fit) ?? 1;
  });

  /** Steps the card to its next width, kept on the host while the page is arranged. */
  step(): void {
    this.widths.set(this.card(), this.next(), this.arranging());
  }
}
