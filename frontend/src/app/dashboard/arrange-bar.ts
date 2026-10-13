import { Component, inject } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { Arrangement } from './arrangement';

/**
 * Above the categories: the switch that groups the cards by category, and the button that starts
 * arranging the cards, or, while they are arranged, a notice of how, with the buttons to start over
 * and to finish.
 */
@Component({
  selector: 'app-arrange-bar',
  template: `
    <button
      type="button"
      class="group"
      role="switch"
      [attr.aria-checked]="arrangement.grouped()"
      (click)="arrangement.group(!arrangement.grouped())"
    >
      <span class="track" aria-hidden="true"></span>
      {{ i18n.t('arrange.group') }}
    </button>
    @if (arrangement.arranging()) {
      <div class="notice" role="status">
        <p>{{ i18n.t('arrange.notice') }}</p>
        <button
          type="button"
          class="reset"
          [disabled]="!arrangement.arranged()"
          (click)="arrangement.reset()"
        >
          {{ i18n.t('arrange.reset') }}
        </button>
        <button type="button" class="done" (click)="arrangement.arranging.set(false)">
          {{ i18n.t('arrange.done') }}
        </button>
      </div>
    } @else {
      <button type="button" class="start" (click)="arrangement.arranging.set(true)">
        <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
        </svg>
        {{ i18n.t('arrange.start') }}
      </button>
    }
  `,
  styleUrl: './arrange-bar.css',
})
export class ArrangeBar {
  protected readonly arrangement = inject(Arrangement);
  protected readonly i18n = inject(I18n);
}
