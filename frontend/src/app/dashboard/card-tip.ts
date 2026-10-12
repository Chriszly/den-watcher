import { Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * A sign at a card's title with a text about the card: shown while the mouse points at the sign,
 * while it has the keyboard focus, and after a tap or click until the next one, a tap elsewhere or
 * Escape, which also hides it while the mouse stays or the focus does. The text lies across the
 * card, under the title, so it stays inside the card on every width.
 */
@Directive({
  host: {
    '(document:pointerdown)': 'pointerDown($event)',
    '(keydown.escape)': 'dismiss()',
    '(focusout)': 'dismissed.set(false)',
    '(mouseleave)': 'dismissed.set(false)',
  },
})
export abstract class CardTip {
  /** Whether a tap or click opened the text, which then stays without the mouse on the sign. */
  protected readonly open = signal(false);
  /**
   * Whether Escape closed the text, which then also stays closed while the mouse points at the sign
   * or it has the focus, until the mouse leaves or the focus goes.
   */
  protected readonly dismissed = signal(false);

  protected readonly host: HTMLElement = inject(ElementRef).nativeElement;

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
