import { Component, Injector, computed, inject, input } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { MissingParts } from '../update/missing-part';
import { DeviceService } from './devices';

/** Opens the list of devices to add or remove one; compact, it shows only a plus. */
@Component({
  selector: 'app-manage-button',
  template: `
    <button type="button" class="outlined-button" [title]="label()" (click)="open()">
      @if (compact()) {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
        </svg>
        <span class="visually-hidden">{{ label() }}</span>
      } @else {
        {{ label() }}
      }
    </button>
  `,
  styleUrl: './manage-button.css',
  host: { '[class.compact]': 'compact()' },
})
export class ManageButton {
  readonly compact = input(false);

  private readonly devices = inject(DeviceService);
  private readonly i18n = inject(I18n);
  private readonly injector = inject(Injector);
  private readonly parts = inject(MissingParts);

  protected readonly label = computed(() =>
    this.i18n.t(this.devices.devices().length > 1 ? 'devices.manage' : 'devices.addOther'),
  );

  /** The dialogs are loaded only when they are opened, so the page loads fast. */
  protected async open(): Promise<void> {
    const { openDevicesDialog } = await this.parts.load(() => import('./devices-dialog'));
    openDevicesDialog(this.injector);
  }
}
