import { Component, input } from '@angular/core';

import { AlertLevel } from '../alerts/alert';
import { AlertIcon } from '../alerts/alert-icon';
import { CardTip } from './card-tip';

/**
 * The sign of the alerts on a card at its title, which tells what they are as a {@link CardTip},
 * one alert to a line of its text.
 */
@Component({
  selector: 'app-card-alert',
  imports: [AlertIcon],
  template: `
    <button
      type="button"
      class="info"
      [attr.aria-label]="i18n.t('alerts.onCard')"
      [attr.aria-describedby]="id"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      <app-alert-icon [level]="level()" />
    </button>
    <span
      class="tip"
      role="tooltip"
      aria-hidden="true"
      [id]="id"
      [class.open]="open()"
      [class.dismissed]="dismissed()"
      >{{ text() }}</span
    >
  `,
  styleUrls: ['./card-info.css', './card-alert.css'],
  host: { '[class.warning]': "level() === 'warning'" },
})
export class CardAlert extends CardTip {
  readonly level = input.required<AlertLevel>();
}
