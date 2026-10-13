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
      <ul role="alert">
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
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin: 0 0 1.25rem;
      padding: 0;
      list-style: none;
    }

    li {
      --alert-icon-size: 2rem;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 1rem 0.5rem 0.5rem;
      border: 2px solid light-dark(#c62828, #f85149);
      border-radius: var(--mat-sys-corner-medium);
      background: light-dark(#fdecea, #3a1210);
      color: light-dark(#8e1c1c, #ffb4ab);
      font: var(--mat-sys-title-medium);
    }

    li.warning {
      border-color: light-dark(#b26a00, #f0a030);
      background: light-dark(#fff4e0, #33240a);
      color: light-dark(#6d4100, #ffd28a);
    }

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
