import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, inject, input, output } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { CardSlot } from './card-slot';
import { WidthIcon } from './width-icon';

/**
 * The controls to move, pin and hide a card while the page is arranged, in a row above the card:
 * a handle to drag it, arrows to move it by one place for the keyboard and touch, a button to
 * make a card with charts wider for every browser, one to pin it above the categories and one to
 * hide it, or to put a value made into a card back in the details. The card's slot is the cdkDrag
 * the handle drags.
 */
@Component({
  selector: 'app-arrange-controls',
  imports: [CdkDragHandle, WidthIcon],
  template: `
    <button
      type="button"
      class="handle"
      cdkDragHandle
      [attr.aria-label]="i18n.t('arrange.drag', { card: card() })"
      [title]="i18n.t('arrange.drag', { card: card() })"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>
    </button>
    <button
      type="button"
      class="earlier"
      [disabled]="first()"
      (click)="earlier.emit()"
      [attr.aria-label]="i18n.t('arrange.earlier', { card: card() })"
      [title]="i18n.t('arrange.earlier', { card: card() })"
    >
      <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
    <button
      type="button"
      class="later"
      [disabled]="last()"
      (click)="later.emit()"
      [attr.aria-label]="i18n.t('arrange.later', { card: card() })"
      [title]="i18n.t('arrange.later', { card: card() })"
    >
      <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    @if (slot && (charts() || slot.width() > 1) && slot.widens()) {
      @let label = i18n.t(slot.next() > 1 ? 'arrange.wider' : 'arrange.narrower', { card: card() });
      <button
        type="button"
        class="width"
        [attr.aria-pressed]="slot.shown() > 1"
        (click)="slot.step()"
        [attr.aria-label]="label"
        [title]="label"
      >
        <app-width-icon [narrower]="slot.next() === 1" />
      </button>
    }
    <button
      type="button"
      class="pin"
      [attr.aria-pressed]="pinned()"
      (click)="pin.emit()"
      [attr.aria-label]="i18n.t('arrange.pin', { card: card() })"
      [title]="i18n.t('arrange.pin', { card: card() })"
    >
      <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6l-1 6 4 4H6l4-4-1-6zM12 13v8" />
      </svg>
    </button>
    <button
      type="button"
      class="hide"
      (click)="hide.emit()"
      [attr.aria-label]="i18n.t(made() ? 'arrange.unmake' : 'arrange.hide', { card: card() })"
      [title]="i18n.t(made() ? 'arrange.unmake' : 'arrange.hide', { card: card() })"
    >
      <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-3.2 3.7M6.6 7.6A17 17 0 0 0 3 12s4 6 9 6a9 9 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"
        />
      </svg>
    </button>
  `,
  styleUrl: './arrange-controls.css',
  host: { role: 'group', '[attr.aria-label]': 'card()' },
})
export class ArrangeControls {
  /** The title of the card. */
  readonly card = input.required<string>();
  /** Whether the card is the first of its category, which cannot move earlier. */
  readonly first = input(false);
  /** Whether the card is the last of its category, which cannot move later. */
  readonly last = input(false);
  /** Whether the card is pinned above the categories. */
  readonly pinned = input(false);
  /** Whether the card is a value of the details made into a card, which hiding puts back there. */
  readonly made = input(false);
  readonly earlier = output();
  readonly later = output();
  /** Asks to pin the card, or to unpin it when it is pinned. */
  readonly pin = output();
  readonly hide = output();
  /** Whether the card has charts, which a wider card shows larger; a wider card without them can be narrowed. */
  readonly charts = input(false);

  protected readonly i18n = inject(I18n);
  /** The card's place in its grid, whose width the width button steps and keeps on the host. */
  protected readonly slot = inject(CardSlot, { optional: true });
}
