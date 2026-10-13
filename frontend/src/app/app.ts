import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AlertNotifications } from './alerts/alert-notifications';
import { AlertTab } from './alerts/alert-tab';
import { AlertsButton } from './alerts/alerts-button';
import { Compare } from './compare/compare';
import { ConnectionBanner } from './connection/connection-banner';
import { Dashboard } from './dashboard/dashboard';
import { DevicePicker } from './devices/device-picker';
import { DeviceService } from './devices/devices';
import { ManageButton } from './devices/manage-button';
import { TimelineMode } from './history/timeline';
import { I18n } from './i18n/i18n';
import { LanguageSwitcher } from './language/language-switcher';
import { Sidebar, SidebarState } from './layout/sidebar';
import { Mascot } from './mascot/mascot';
import { ThemeToggle } from './theme/theme-toggle';
import { UpdateNotice } from './update/update-notice';

@Component({
  selector: 'app-root',
  imports: [
    AlertsButton,
    Compare,
    ConnectionBanner,
    Dashboard,
    DevicePicker,
    LanguageSwitcher,
    ManageButton,
    Mascot,
    Sidebar,
    ThemeToggle,
    UpdateNotice,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly devices = inject(DeviceService);
  protected readonly sidebar = inject(SidebarState);
  protected readonly i18n = inject(I18n);
  protected readonly timeline = inject(TimelineMode);

  constructor() {
    this.devices.polling.pipe(takeUntilDestroyed()).subscribe();
    // They tell about alerts in the tab's title and favicon and in the browser's notifications.
    inject(AlertTab);
    inject(AlertNotifications);
  }
}
