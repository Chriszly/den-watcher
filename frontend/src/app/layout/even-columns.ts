import {
  DestroyRef,
  Directive,
  ElementRef,
  booleanAttribute,
  inject,
  input,
  signal,
} from '@angular/core';

import { observeWidth } from '../browser';

/** How many cards at least `minCard` pixels wide fit side by side in a grid `width` pixels wide. */
export function cardsFit(width: number, minCard: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (minCard + gap)));
}

/**
 * How many columns `cards` cards get in a grid `width` pixels wide: as many as fit, but no more
 * than keep the rows even, so a card never wraps onto a row of its own (7 that fit 6 per row
 * become 4 + 3, 8 that fit 7 become 4 + 4). With `keepWidth`, cards that fit in one row keep the
 * width they have when the row is full, so a grid of a few cards matches the grids around it.
 */
export function evenColumns(
  cards: number,
  width: number,
  minCard: number,
  gap: number,
  keepWidth = false,
): number {
  const fit = cardsFit(width, minCard, gap);
  const rows = Math.max(1, Math.ceil(cards / fit));
  return keepWidth && rows === 1 ? fit : Math.max(1, Math.ceil(cards / rows));
}

/** The narrowest a card gets in pixels, from the grid's `--min-card` in rem, as its CSS sets it. */
export function minCardWidth(minCard: string, rem: number): number {
  const width = parseFloat(minCard);
  if (!minCard.trim().endsWith('rem') || !(width > 0)) {
    throw new Error(`--min-card must be set in rem on the grid, such as 14rem, not "${minCard}"`);
  }
  return width * rem;
}

/**
 * Sets `--columns` on a grid of cards to the count that keeps its rows even. It counts again when
 * cards come or go (some only show when the device reports them), when a card's `data-width` (how
 * many cards wide it is set) changes and when the grid's width changes. A grid with a card set wider
 * than one gets as many columns as cards fit side by side.
 */
@Directive({ selector: '[appEvenColumns]' })
export class EvenColumns {
  /** Whether cards that fit in one row keep the width of a full row; see evenColumns. */
  readonly keepCardWidth = input(false, { transform: booleanAttribute });
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private width = 0;
  private readonly fitting = signal(1);
  private readonly counted = signal(1);
  /** How many cards fit side by side; 1 until the grid is laid out. */
  readonly fit = this.fitting.asReadonly();
  /** The columns of the grid, as `--columns` sets them; 1 until the grid is laid out. */
  readonly columns = this.counted.asReadonly();

  constructor() {
    const cards = new MutationObserver(() => this.update());
    cards.observe(this.host, { childList: true });
    const widths = new MutationObserver(() => this.update());
    widths.observe(this.host, { subtree: true, attributeFilter: ['data-width'] });

    // Only the width changes how many cards fit; the columns never change the grid's width. The
    // observer also reports the first width once the grid is laid out, which does the first count.
    observeWidth(this.host, (width) => {
      this.width = width;
      this.update();
    });

    inject(DestroyRef).onDestroy(() => {
      cards.disconnect();
      widths.disconnect();
    });
  }

  private update(): void {
    if (this.width === 0) {
      return; // not laid out yet; the first width counts the columns
    }
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const style = getComputedStyle(this.host);
    const gap = parseFloat(style.columnGap) || 0;
    const minCard = minCardWidth(style.getPropertyValue('--min-card'), rem);
    const fit = cardsFit(this.width, minCard, gap);
    const wider = [...this.host.children].some(
      (card) => Number((card as HTMLElement).dataset['width']) > 1,
    );
    // Rows with a wider card are not even anyway, so the cards keep the width of a full row.
    const columns = wider
      ? fit
      : evenColumns(this.host.children.length, this.width, minCard, gap, this.keepCardWidth());
    this.host.style.setProperty('--columns', String(columns));
    this.fitting.set(fit);
    this.counted.set(columns);
  }
}
