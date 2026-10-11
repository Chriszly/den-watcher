import { formatDate } from '@angular/common';
import { Component, Injector, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';

import { DeviceService } from '../devices/devices';
import { I18n } from '../i18n/i18n';
import { Alert } from './alert';
import { AlertIcon } from './alert-icon';
import { AlertService, alertDeviceName, alertText } from './alerts';

/** The log of alerts: the ones that last first, then the ones that ended, newest first. */
@Component({
  selector: 'app-alerts-dialog',
  imports: [
    AlertIcon,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
  ],
  templateUrl: './alerts-dialog.html',
  styleUrl: './alerts-dialog.css',
})
export class AlertsDialog {
  protected readonly i18n = inject(I18n);
  private readonly devices = inject(DeviceService);

  /** Null while the log is read. */
  protected readonly log = signal<Alert[] | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    inject(AlertService)
      .log()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (list) =>
          this.log.set([...list.filter((a) => !a.ended), ...list.filter((a) => a.ended)]),
        error: () => this.failed.set(true),
      });
  }

  protected text(alert: Alert): string {
    return alertText(alert, this.i18n);
  }

  protected deviceName(alert: Alert): string {
    return alertDeviceName(alert, this.devices, this.i18n);
  }

  /** When the alert started and ended, or since when it lasts. */
  protected when(alert: Alert): string {
    const language = this.i18n.language();
    const started = formatDate(alert.started, 'short', language);
    if (!alert.ended) {
      return this.i18n.t('alerts.since', { since: started });
    }
    const ended = formatDate(alert.ended, 'short', language);
    return this.i18n.t('alerts.fromTo', { from: started, to: ended });
  }
}

export function openAlertsDialog(injector: Injector): void {
  injector.get(MatDialog).open(AlertsDialog, { autoFocus: 'dialog', injector });
}
