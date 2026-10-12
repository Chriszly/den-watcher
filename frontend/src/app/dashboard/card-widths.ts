import { Injectable, inject, signal } from '@angular/core';

import { PageLayout } from './page-layout';

/** How many cards wide a card can be set, narrowest first. */
export const CARD_WIDTHS = [1, 2, 4] as const;

/**
 * How many cards wide each card is. A width set while the page is arranged is kept on the host with
 * the rest of the layout; one set otherwise holds only until the page loads again, over the kept one.
 */
@Injectable({ providedIn: 'root' })
export class CardWidths {
  private readonly layout = inject(PageLayout);
  /** The widths set without arranging, by card. */
  private readonly passing = signal<ReadonlyMap<string, number>>(new Map());

  /**
   * How many cards wide the card is set; 1 unless it was set wider. With `kept`, the width kept on
   * the host, as arranging shows it, without one set only until the page loads again.
   */
  width(card: string, kept = false): number {
    const widths = this.layout.layout().widths;
    const width = Object.hasOwn(widths, card) ? widths[card] : 1;
    return kept ? width : (this.passing().get(card) ?? width);
  }

  /** Forgets the widths set only until the page loads again, so the kept ones show. */
  forgetPassing(): void {
    this.passing.set(new Map());
  }

  /** Sets how many cards wide the card is; `keep` keeps it on the host. */
  set(card: string, width: number, keep: boolean): void {
    this.passing.update((passing) => {
      const widths = new Map(passing);
      if (keep) {
        widths.delete(card);
      } else {
        widths.set(card, width);
      }
      return widths;
    });
    if (keep) {
      this.layout.change((layout) => {
        const widths = Object.entries(layout.widths).filter(([other]) => other !== card);
        return {
          ...layout,
          widths: Object.fromEntries(width > 1 ? [...widths, [card, width]] : widths),
        };
      });
    }
  }
}
