import { Component, inject } from '@angular/core';

import { AlertChips } from '../alerts/alert-chips';
import { AlertService } from '../alerts/alerts';

/** On a wall display, the alerts of every device, above the device shown, so problems come first. */
@Component({
  selector: 'app-kiosk-alerts',
  imports: [AlertChips],
  template: `<app-alert-chips [alerts]="alerts.active()" withDevice />`,
})
export class KioskAlerts {
  protected readonly alerts = inject(AlertService);
}
