import { Component, inject } from '@angular/core';

import { AlertIcon } from '../alerts/alert-icon';
import { Alert } from '../alerts/alert';
import { AlertService, alertDeviceName, alertText } from '../alerts/alerts';
import { DeviceService } from '../devices/devices';
import { I18n } from '../i18n/i18n';

/** On a wall display, the alerts of every device, above the device shown, so problems come first. */
@Component({
  selector: 'app-kiosk-alerts',
  imports: [AlertIcon],
  template: `
    @if (alerts.active().length > 0) {
      <ul class="alert-chips" role="alert">
        @for (alert of alerts.active(); track alert.id) {
          <li [class.warning]="alert.level === 'warning'">
            <app-alert-icon [level]="alert.level" />
            <span
              ><span class="device">{{ deviceName(alert) }}:</span> {{ text(alert) }}</span
            >
          </li>
        }
      </ul>
    }
  `,
  // As the alerts above a device's cards, with the device's name.
  styles: `
    .device {
      font-weight: 700;
    }
  `,
})
export class KioskAlerts {
  protected readonly alerts = inject(AlertService);
  private readonly devices = inject(DeviceService);
  private readonly i18n = inject(I18n);

  protected deviceName(alert: Alert): string {
    return alertDeviceName(alert, this.devices, this.i18n);
  }

  protected text(alert: Alert): string {
    return alertText(alert, this.i18n);
  }
}
