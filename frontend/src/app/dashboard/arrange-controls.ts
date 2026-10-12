import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, inject, input, output } from '@angular/core';

import { I18n } from '../i18n/i18n';

/**
 * The controls to move and hide a card while the page is arranged, in the card's top border at the
 * right: a handle to drag it, arrows to move it by one place for the keyboard and touch, and a
 * button to hide it. The card's slot is the cdkDrag the handle drags.
 */
@Component({
  selector: 'app-arrange-controls',
  imports: [CdkDragHandle],
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
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
    </button>
    <button
      type="button"
      class="later"
      [disabled]="last()"
      (click)="later.emit()"
      [attr.aria-label]="i18n.t('arrange.later', { card: card() })"
      [title]="i18n.t('arrange.later', { card: card() })"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    <button
      type="button"
      class="hide"
      (click)="hide.emit()"
      [attr.aria-label]="i18n.t('arrange.hide', { card: card() })"
      [title]="i18n.t('arrange.hide', { card: card() })"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
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
  readonly earlier = output();
  readonly later = output();
  readonly hide = output();

  protected readonly i18n = inject(I18n);
}
