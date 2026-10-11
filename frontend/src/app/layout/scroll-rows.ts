import {
  Component,
  DestroyRef,
  ElementRef,
  afterEveryRender,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { I18n } from '../i18n/i18n';

/** The most entries a card shows at once; more scroll. */
export const MAX_ROWS = 8;

/**
 * How high the list may be to show its first `max` rows, from their offsets in the list: the bottom
 * of the last one shown. Null while all rows fit, so the list keeps its natural height.
 */
export function rowsHeight(
  rows: readonly { offsetTop: number; offsetHeight: number }[],
  max = MAX_ROWS,
): number | null {
  if (rows.length <= max) {
    return null;
  }
  const last = rows[max - 1];
  return last.offsetTop + last.offsetHeight;
}

/** Whether rows are hidden below the visible part of a list; a pixel is left for rounding. */
export function moreBelow(list: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}): boolean {
  return list.scrollTop + list.clientHeight < list.scrollHeight - 1;
}

/** Whether rows are hidden above the visible part of a list; a pixel is left for rounding. */
export function moreAbove(list: { scrollTop: number }): boolean {
  return list.scrollTop > 1;
}

/** How far a wheel event scrolls, in pixels, from its delta in pixels, lines or pages. */
export function wheelPixels(event: { deltaY: number; deltaMode: number }, page: number): number {
  switch (event.deltaMode) {
    case 1: // WheelEvent.DOM_DELTA_LINE
      return event.deltaY * 16;
    case 2: // WheelEvent.DOM_DELTA_PAGE
      return event.deltaY * page;
    default:
      return event.deltaY;
  }
}

/**
 * The entries of a card, of which it shows the first eight; more scroll, without a scrollbar. An
 * arrow below them tells that more follow and scrolls down a page; it hides at the bottom. Once
 * scrolled, an arrow over the top does the same upwards. While the pointer is over the card, the
 * wheel scrolls only the list, also over its heading and at either end, not the page. It measures
 * again after every render, as values that refresh can change how high a row is, and when its width
 * changes, which can wrap rows.
 */
@Component({
  selector: 'app-scroll-rows',
  templateUrl: './scroll-rows.html',
  styleUrl: './scroll-rows.css',
})
export class ScrollRows {
  protected readonly i18n = inject(I18n);
  /** Whether the entries are more than fit, so the list scrolls. */
  protected readonly scrolls = signal(false);
  /** Whether entries are hidden below, so the arrow shows. */
  protected readonly more = signal(false);
  /** Whether entries are hidden above, so the arrow at the top shows. */
  protected readonly above = signal(false);

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private width = 0;

  constructor() {
    afterEveryRender(() => this.measure());

    const host: HTMLElement = inject(ElementRef).nativeElement;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width !== this.width) {
        this.width = entry.contentRect.width;
        requestAnimationFrame(() => this.measure());
      }
    });
    observer.observe(host);

    // Over the list the browser scrolls it, and overscroll-behavior keeps the page still at its
    // ends; over the rest of the card, such as its heading, the wheel scrolls the list here.
    let card: Element = host;
    const wheel = (event: WheelEvent) => {
      const list = this.list().nativeElement;
      if (!this.scrolls() || event.ctrlKey || event.deltaY === 0) {
        return;
      }
      if (!list.contains(event.target as Node)) {
        event.preventDefault();
        list.scrollBy({ top: wheelPixels(event, list.clientHeight) });
      }
    };
    afterNextRender(() => {
      card = host.closest('.card') ?? host;
      card.addEventListener('wheel', wheel as EventListener, { passive: false });
    });
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      card.removeEventListener('wheel', wheel as EventListener);
    });
  }

  protected update(): void {
    const list = this.list().nativeElement;
    this.more.set(this.scrolls() && moreBelow(list));
    this.above.set(this.scrolls() && moreAbove(list));
  }

  protected scrollDown(): void {
    const list = this.list().nativeElement;
    list.scrollBy({ top: list.clientHeight, behavior: 'smooth' });
  }

  protected scrollUp(): void {
    const list = this.list().nativeElement;
    list.scrollBy({ top: -list.clientHeight, behavior: 'smooth' });
  }

  private measure(): void {
    const list = this.list().nativeElement;
    const height = rowsHeight([...list.children] as HTMLElement[]);
    const maxHeight = height === null ? '' : `${height}px`;
    if (list.style.maxHeight !== maxHeight) {
      list.style.maxHeight = maxHeight;
    }
    this.scrolls.set(height !== null);
    this.update();
  }
}
