import { Component, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { I18n } from '../i18n/i18n';
import { DeviceItem } from './device-item';
import { DEVICE_KINDS, Device, DeviceService } from './devices';
import { FleetValues } from './fleet-values';
import { ManageButton } from './manage-button';

/**
 * The list of devices to pick the one whose usage is shown, once the hub collects from other
 * devices, grouped into servers and PCs, with the comparison of all of them first and the button to
 * add or remove devices last. Compact, it shows the devices as rings.
 */
@Component({
  selector: 'app-device-picker',
  imports: [DeviceItem, ManageButton],
  templateUrl: './device-picker.html',
  styleUrl: './device-picker.css',
  host: { '[class.compact]': 'compact()' },
})
export class DevicePicker {
  readonly compact = input(false);

  protected readonly devices = inject(DeviceService);
  protected readonly fleet = inject(FleetValues);
  protected readonly i18n = inject(I18n);

  /** The devices by kind, servers first; the hub and things without a kind count as servers. */
  protected readonly groups = computed(() =>
    DEVICE_KINDS.map((kind) => ({
      kind,
      devices: this.devices.devices().filter((d) => (d.kind ?? 'server') === kind),
    })).filter((group) => group.devices.length > 0),
  );

  constructor() {
    this.fleet.watch.pipe(takeUntilDestroyed()).subscribe();
  }

  /** Shows the device on its own, also when the devices were being compared. */
  protected pick(device: Device): void {
    this.devices.show(device.id);
  }
}
