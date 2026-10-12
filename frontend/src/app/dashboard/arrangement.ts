import { Injectable, computed, inject, signal } from '@angular/core';

import { PageLayout } from './page-layout';

/**
 * How the cards are arranged: their order within each category, which are hidden, which are pinned
 * above the categories and which values of the details are made into cards of their own, kept on
 * the host with the rest of the page's layout. While arranging, the page shows how to move, pin,
 * hide and make cards; otherwise it only shows them as arranged.
 */
@Injectable({ providedIn: 'root' })
export class Arrangement {
  private readonly layout = inject(PageLayout);
  /** Whether the page is being arranged, which shows the controls to move and hide cards. */
  readonly arranging = signal(false);
  readonly hidden = computed(() => new Set(this.layout.layout().hidden));
  /** The pinned cards by id, in their order above the categories. */
  readonly pinned = computed(() => this.layout.layout().pinned);
  /** The values of the details made into cards, by the card's id. */
  readonly made = computed(() => new Set(this.layout.layout().made));
  /** Whether the page has been arranged at all, so Reset has something to undo. */
  readonly arranged = computed(() => {
    const { order, hidden, pinned, made } = this.layout.layout();
    return order.length > 0 || hidden.length > 0 || pinned.length > 0 || made.length > 0;
  });
  private readonly position = computed(
    () => new Map(this.layout.layout().order.map((id, index) => [id, index])),
  );

  /** The cards in the order they were arranged in; the ones never moved after, as they came. */
  sort<T extends { id: string }>(cards: readonly T[]): T[] {
    const position = this.position();
    const at = (card: T) => position.get(card.id) ?? position.size;
    // The sort is stable, so the cards never moved keep their order.
    return [...cards].sort((a, b) => at(a) - at(b));
  }

  /**
   * Moves the card at `from` among the shown cards of a category, by id in their order, to `to`.
   * The whole category's order is kept, so it stays as it is shown when other cards come or go.
   */
  move(ids: readonly string[], from: number, to: number): void {
    const moved = reordered(ids, from, to);
    if (!moved) {
      return;
    }
    this.layout.change((layout) => ({
      ...layout,
      order: [...layout.order.filter((id) => !moved.includes(id)), ...moved],
    }));
  }

  /**
   * Moves the pinned card at `from` among the shown pinned cards, by id in their order, to `to`. The
   * pinned cards the device does not have keep their places after them.
   */
  movePinned(ids: readonly string[], from: number, to: number): void {
    const moved = reordered(ids, from, to);
    if (!moved) {
      return;
    }
    this.layout.change((layout) => ({
      ...layout,
      pinned: [...moved, ...layout.pinned.filter((id) => !moved.includes(id))],
    }));
  }

  /** Pins a card above the categories, after the cards pinned before; unpins a pinned one. */
  togglePin(id: string): void {
    this.layout.change((layout) => ({
      ...layout,
      pinned: layout.pinned.includes(id)
        ? layout.pinned.filter((p) => p !== id)
        : [...layout.pinned, id],
    }));
  }

  /** Makes a value of the details a card of its own, after the other cards of its category. */
  make(id: string): void {
    this.layout.change((layout) =>
      layout.made.includes(id) ? layout : { ...layout, made: [...layout.made, id] },
    );
  }

  /**
   * Puts a value made into a card back in the details. Its pin and its place go too, so made again
   * it comes after the other cards of its category.
   */
  unmake(id: string): void {
    const drop = (ids: string[]) => ids.filter((other) => other !== id);
    this.layout.change((layout) => ({
      ...layout,
      made: drop(layout.made),
      pinned: drop(layout.pinned),
      order: drop(layout.order),
    }));
  }

  hide(id: string): void {
    this.layout.change((layout) =>
      layout.hidden.includes(id) ? layout : { ...layout, hidden: [...layout.hidden, id] },
    );
  }

  show(id: string): void {
    this.layout.change((layout) => ({ ...layout, hidden: layout.hidden.filter((h) => h !== id) }));
  }

  /**
   * Shows every card again in its category, in the order the page puts them in, and every value in
   * the details; folded categories stay folded.
   */
  reset(): void {
    this.layout.change((layout) => ({ ...layout, order: [], hidden: [], pinned: [], made: [] }));
  }
}

/** The ids with the one at `from` moved to `to`; null when it does not move or `to` is outside. */
function reordered(ids: readonly string[], from: number, to: number): string[] | null {
  if (from === to || to < 0 || to >= ids.length) {
    return null;
  }
  const moved = [...ids];
  moved.splice(to, 0, ...moved.splice(from, 1));
  return moved;
}
