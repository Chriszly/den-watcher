import { Component, ElementRef, inject, input, signal } from '@angular/core';

import { I18n } from '../i18n/i18n';

let nextId = 0;

/**
 * An (i) next to a card's title that tells what the card shows: while the mouse points at it, while
 * it has the keyboard focus, and after a tap or click until the next one, a tap elsewhere or Escape.
 * The text lies across the card, under the title, so it stays inside the card on every width.
 */
@Component({
  selector: 'app-card-info',
  templateUrl: './card-info.html',
  styleUrl: './card-info.css',
  host: {
    '(document:pointerdown)': 'pointerDown($event)',
    '(keydown.escape)': 'open.set(false)',
  },
})
export class CardInfo {
  /** What the card shows. */
  readonly text = input.required<string>();

  protected readonly i18n = inject(I18n);
  protected readonly id = `card-info-${nextId++}`;
  /** Whether a tap or click opened the text, which then stays without the mouse on the (i). */
  protected readonly open = signal(false);

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  protected pointerDown(event: PointerEvent): void {
    if (!this.host.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
