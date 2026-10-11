import { Component, ElementRef, afterEveryRender, inject, input, signal } from '@angular/core';

import { I18n } from '../i18n/i18n';

let nextId = 0;

/**
 * An (i) next to a card's title that tells what the card shows: while the mouse points at it, while
 * it has the keyboard focus, and after a tap or click until the next one, a tap elsewhere or Escape, which also hides it while the
 * mouse stays or the focus does.
 * The text lies across the card, under the title, so it stays inside the card on every width.
 */
@Component({
  selector: 'app-card-info',
  templateUrl: './card-info.html',
  styleUrl: './card-info.css',
  host: {
    '(document:pointerdown)': 'pointerDown($event)',
    '(keydown.escape)': 'dismiss()',
    '(focusout)': 'dismissed.set(false)',
    '(mouseleave)': 'dismissed.set(false)',
  },
})
export class CardInfo {
  /** What the card shows. */
  readonly text = input.required<string>();

  protected readonly i18n = inject(I18n);
  protected readonly id = `card-info-${nextId++}`;
  /** Whether a tap or click opened the text, which then stays without the mouse on the (i). */
  protected readonly open = signal(false);
  /**
   * Whether Escape closed the text, which then also stays closed while the mouse points at the (i) or
   * it has the focus, until the mouse leaves or the focus goes.
   */
  protected readonly dismissed = signal(false);

  /** The card's title, for the button's name, as the heading the (i) stands in shows it. */
  protected readonly title = signal('');

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    // The heading is named by its title alone, without the (i)'s name after it.
    afterEveryRender(() => {
      const title = headingTitle(this.host);
      this.title.set(title);
      if (this.host.parentElement?.getAttribute('aria-label') !== title) {
        this.host.parentElement?.setAttribute('aria-label', title);
      }
    });
  }

  protected toggle(): void {
    this.dismissed.set(false);
    this.open.set(!this.open());
  }

  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.set(true);
  }

  protected pointerDown(event: PointerEvent): void {
    if (!this.host.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}

/** The text of the heading an element stands in, without the element's own text. */
export function headingTitle(element: Element): string {
  const heading = element.parentElement;
  if (heading === null) {
    return '';
  }
  return [...heading.childNodes]
    .filter((node) => node !== element)
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();
}
