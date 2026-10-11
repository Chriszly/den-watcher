import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AlertsButton } from './alerts/alerts-button';
import { Compare } from './compare/compare';
import { ConnectionBanner } from './connection/connection-banner';
import { Dashboard } from './dashboard/dashboard';
import { DevicePicker } from './devices/device-picker';
import { DeviceService } from './devices/devices';
import { ManageButton } from './devices/manage-button';
import { HistoryCharts } from './history/history';
import { I18n } from './i18n/i18n';
import { LanguageSwitcher } from './language/language-switcher';
import { Sidebar, SidebarState } from './layout/sidebar';
import { Mascot } from './mascot/mascot';
import { ThemeService } from './theme/theme';
import { UpdateNotice } from './update/update-notice';

@Component({
  selector: 'app-root',
  imports: [
    AlertsButton,
    Compare,
    ConnectionBanner,
    Dashboard,
    DevicePicker,
    HistoryCharts,
    LanguageSwitcher,
    ManageButton,
    Mascot,
    Sidebar,
    UpdateNotice,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly theme = inject(ThemeService);
  protected readonly devices = inject(DeviceService);
  protected readonly sidebar = inject(SidebarState);
  protected readonly i18n = inject(I18n);

  protected readonly themeToggleLabel = computed(() =>
    this.i18n.t(this.theme.scheme() === 'dark' ? 'app.switchToLight' : 'app.switchToDark'),
  );

  constructor() {
    this.devices.polling.pipe(takeUntilDestroyed()).subscribe();
  }
}
