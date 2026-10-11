import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/** What the cards of the dashboard are grouped by, in the order the page shows them. */
export const CATEGORIES = [
  'system',
  'storage',
  'network',
  'temperature',
  'programs',
  'other',
  'device',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Where the cards of the extras the page knows go; the others go to `other`. */
const EXTRA_CATEGORIES: Record<string, Category> = {
  gpu: 'system',
  pressure: 'system',
  memory: 'system',
  'memory-committed': 'system',
  'memory-writeback': 'system',
  'memory-faults': 'system',
  'memory-disk': 'system',
  kernel: 'system',
  'kernel-processes': 'system',
  'kernel-in-use': 'system',
  'kernel-tcp': 'system',
  inodes: 'storage',
  smart: 'storage',
  'smart-checks': 'storage',
  wifi: 'network',
  bluetooth: 'network',
  ports: 'network',
  clients: 'network',
  connected: 'network',
  internet: 'network',
  reachability: 'network',
  power: 'temperature',
  'processes-cpu': 'programs',
  'processes-memory': 'programs',
  'containers-cpu': 'programs',
  'containers-memory': 'programs',
};

/** The category of the card of the extras group `id`. */
export function extraCategory(id: string): Category {
  return Object.hasOwn(EXTRA_CATEGORIES, id) ? EXTRA_CATEGORIES[id] : 'other';
}

/** The items by category, in the order of CATEGORIES, each in the order given; empty ones left out. */
export function byCategory<T>(
  items: readonly T[],
  category: (item: T) => Category,
): { category: Category; items: T[] }[] {
  return CATEGORIES.map((c) => ({
    category: c,
    items: items.filter((i) => category(i) === c),
  })).filter((group) => group.items.length > 0);
}

/** Where the folded categories are kept between visits, in the browser's localStorage. */
export const FOLDED_STORAGE_KEY = 'foldedCategories';

/** Which categories of cards are folded, so only their title shows; kept for the next visit. */
@Injectable({ providedIn: 'root' })
export class FoldedCategories {
  private readonly document = inject(DOCUMENT);
  readonly folded = signal<ReadonlySet<Category>>(this.stored());

  /** Folds the category, or unfolds it when it is folded. */
  toggle(category: Category): void {
    const folded = new Set(this.folded());
    if (!folded.delete(category)) {
      folded.add(category);
    }
    this.folded.set(folded);
    try {
      this.document.defaultView?.localStorage.setItem(
        FOLDED_STORAGE_KEY,
        JSON.stringify([...folded]),
      );
    } catch {
      // Without storage (a private window, blocked site data) the choice lasts for this visit.
    }
  }

  private stored(): ReadonlySet<Category> {
    try {
      const value: unknown = JSON.parse(
        this.document.defaultView?.localStorage.getItem(FOLDED_STORAGE_KEY) ?? '[]',
      );
      return new Set(
        Array.isArray(value)
          ? value.filter((c): c is Category => CATEGORIES.includes(c as Category))
          : [],
      );
    } catch {
      return new Set();
    }
  }
}
