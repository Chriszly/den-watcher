import { Component, booleanAttribute, inject, input } from '@angular/core';

import { DeviceService } from '../devices/devices';
import { I18n } from '../i18n/i18n';
import { Alert } from './alert';
import { AlertIcon } from './alert-icon';
import { alertDeviceName, alertText } from './alerts';

/**
 * Alerts in a row, big enough to see from across the room (styled by .alert-chips in styles.scss),
 * with the name of each one's device where they come from several.
 */
@Component({
  selector: 'app-alert-chips',
  imports: [AlertIcon],
  template: `
    @if (alerts().length > 0) {
      <ul class="alert-chips" role="alert">
        @for (alert of alerts(); track alert.id) {
          <li [class.warning]="alert.level === 'warning'">
            <app-alert-icon [level]="alert.level" />
            @if (withDevice()) {
              <span
                ><span class="device">{{ deviceName(alert) }}:</span> {{ text(alert) }}</span
              >
            } @else {
              {{ text(alert) }}
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .device {
      font-weight: 700;
    }
  `,
})
export class AlertChips {
  readonly alerts = input.required<readonly Alert[]>();
  /** Whether each alert tells its device, as on a wall display, which shows every device's. */
  readonly withDevice = input(false, { transform: booleanAttribute });

  private readonly devices = inject(DeviceService);
  private readonly i18n = inject(I18n);

  protected deviceName(alert: Alert): string {
    return alertDeviceName(alert, this.devices, this.i18n);
  }

  protected text(alert: Alert): string {
    return alertText(alert, this.i18n);
  }
}
