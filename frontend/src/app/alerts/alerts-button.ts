import { Component, Injector, computed, inject } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { AlertIcon } from './alert-icon';
import { AlertService, worstLevel } from './alerts';

/**
 * A big red sign with the number of alerts while any device has one, and a quiet button to the
 * log of alerts otherwise. Either opens the log.
 */
@Component({
  selector: 'app-alerts-button',
  imports: [AlertIcon],
  template: `
    @let active = alerts.active();
    @if (level(); as level) {
      <button
        type="button"
        class="active"
        [class.warning]="level === 'warning'"
        [title]="i18n.t('alerts.openLog')"
        (click)="openLog()"
      >
        <app-alert-icon [level]="level" />
        {{ i18n.plural(active.length, 'alerts.count.one', 'alerts.count.other') }}
      </button>
    } @else {
      <button type="button" class="quiet" (click)="openLog()">
        {{ i18n.t('alerts.log') }}
      </button>
    }
  `,
  styleUrl: './alerts-button.css',
})
export class AlertsButton {
  protected readonly alerts = inject(AlertService);
  protected readonly i18n = inject(I18n);
  private readonly injector = inject(Injector);

  protected readonly level = computed(() => worstLevel(this.alerts.active()));

  /** The dialog is loaded only when it is opened, so the page loads fast. */
  protected async openLog(): Promise<void> {
    const { openAlertsDialog } = await import('./alerts-dialog');
    openAlertsDialog(this.injector);
  }
}
