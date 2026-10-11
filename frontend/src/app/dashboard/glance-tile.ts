import { Component, inject, input } from '@angular/core';

import { AlertLevel } from '../alerts/alert';
import { AlertIcon } from '../alerts/alert-icon';
import { I18n } from '../i18n/i18n';

/**
 * One of the main values of a device in large type, with what it is, a detail beside that, a line
 * under it and a small chart of it (put inside) at its foot, from edge to edge. A tile with an alert gets its sign
 * and a border in its color.
 */
@Component({
  selector: 'app-glance-tile',
  imports: [AlertIcon],
  template: `
    <h3>
      {{ label() }}
      @if (alert(); as level) {
        <app-alert-icon [level]="level" role="img" [attr.aria-label]="i18n.t('alerts.onCard')" />
      }
      @if (detail()) {
        <span class="detail">{{ detail() }}</span>
      }
    </h3>
    <p class="value">
      {{ value() }}<span class="unit">{{ unit() }}</span>
    </p>
    @if (sub()) {
      <p class="sub">{{ sub() }}</p>
    }
    <div class="chart"><ng-content /></div>
  `,
  styleUrl: './glance-tile.css',
  host: { '[class]': 'alert()' },
})
export class GlanceTile {
  protected readonly i18n = inject(I18n);

  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly unit = input('');
  /** Beside the label, such as the number of cores or the disk's path. */
  readonly detail = input('');
  /** Under the value, such as the load or how much of the disk is used. */
  readonly sub = input('');
  readonly alert = input<AlertLevel | null>(null);
}
