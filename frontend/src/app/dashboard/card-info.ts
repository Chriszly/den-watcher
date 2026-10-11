import { Component, ElementRef, inject, input, signal } from '@angular/core';

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

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

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
