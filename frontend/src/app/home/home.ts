import { DecimalPipe, formatDate } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AlertLevel } from '../alerts/alert';
import { AlertIcon } from '../alerts/alert-icon';
import { alertText, worstLevel } from '../alerts/alerts';
import { HubConnection } from '../connection/connection';
import { FleetValues } from '../devices/fleet-values';
import {
  DEVICE_GROUPS,
  Device,
  DeviceService,
  DeviceState,
  deviceName,
  deviceState,
} from '../devices/devices';
import { StatusDot } from '../devices/status-dot';
import { I18n } from '../i18n/i18n';
import { Summary } from '../metrics/summary';

/** Something on a device that needs a look, for the list at the top of the home page. */
export interface Problem {
  device: Device;
  level: AlertLevel;
  text: string;
}

/** One device on the home page, with its state and main values. */
interface Tile {
  device: Device;
  name: string;
  state: DeviceState;
  alert: AlertLevel | null;
  summary: Summary | null;
  /** What it does instead of values: that it does not answer, is not in use or is only checked. */
  note: string;
}

/**
 * The home page of a hub: one sentence on how the devices are, what needs a look, and every
 * device as an even tile with its main values, by group as in the list of devices. A click on a
 * problem or a tile shows the device on its own.
 */
@Component({
  selector: 'app-home',
  imports: [AlertIcon, DecimalPipe, StatusDot],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly devices = inject(DeviceService);
  protected readonly i18n = inject(I18n);
  private readonly connection = inject(HubConnection);
  private readonly fleet = inject(FleetValues);
  protected readonly deviceName = (device: Device) => deviceName(device, this.i18n);

  /** Alerts first, then the devices that do not answer, each device's worst first. */
  protected readonly problems = computed((): Problem[] =>
    problemsOf(this.devices.devices(), this.i18n),
  );

  protected readonly counts = computed(() => {
    const states = this.devices.devices().map((d) => deviceState(d, this.connection.lost()));
    const looked = new Set(this.problems().map((p) => p.device.id));
    return {
      look: looked.size,
      fine: this.devices.devices().filter((d, i) => states[i] === 'reachable' && !looked.has(d.id))
        .length,
      notInUse: states.filter((s) => s === 'notInUse').length,
    };
  });

  protected readonly groups = computed(() => {
    const lost = this.connection.lost();
    const summaries = this.fleet.summaries();
    return DEVICE_GROUPS.map((kind) => ({
      kind,
      tiles: this.devices
        .devices()
        .filter((d) => (d.kind ?? 'server') === kind)
        .map((device): Tile => {
          const state = deviceState(device, lost);
          return {
            device,
            name: deviceName(device, this.i18n),
            state,
            alert: worstLevel(device.alerts ?? []),
            summary: state === 'reachable' ? (summaries.get(device.id) ?? null) : null,
            note: this.noteOf(device, state),
          };
        }),
    })).filter((group) => group.tiles.length > 0);
  });

  constructor() {
    this.fleet.watch.pipe(takeUntilDestroyed()).subscribe();
  }

  private noteOf(device: Device, state: DeviceState): string {
    if (state === 'unknown') {
      return this.i18n.t('home.unknown');
    }
    if (state !== 'reachable') {
      const key = state === 'notInUse' ? 'devices.notInUse' : 'devices.unreachable';
      if (!device.unreachableSince) {
        return this.i18n.t(key);
      }
      const since = formatDate(device.unreachableSince, 'short', this.i18n.language());
      return this.i18n.t(`${key}Since`, { since });
    }
    if (device.pairing) {
      return this.i18n.t('home.pairing');
    }
    return device.checked ? this.i18n.t('home.checked') : '';
  }
}

/**
 * What needs a look on the devices: each alert, a server that does not answer, and a device that
 * waits for its pairing code. A PC or laptop that is switched off needs nothing.
 */
export function problemsOf(devices: readonly Device[], i18n: I18n): Problem[] {
  const problems = devices.flatMap((device): Problem[] => {
    const alerts = (device.alerts ?? []).map((alert): Problem => ({
      device,
      level: alert.level,
      text: alertText(alert, i18n),
    }));
    const state = deviceState(device);
    if (state === 'unreachable') {
      const since = device.unreachableSince
        ? formatDate(device.unreachableSince, 'short', i18n.language())
        : null;
      alerts.push({
        device,
        level: 'alert',
        text: since ? i18n.t('devices.unreachableSince', { since }) : i18n.t('devices.unreachable'),
      });
    } else if (device.pairing) {
      alerts.push({ device, level: 'warning', text: i18n.t('home.pairing') });
    }
    return alerts;
  });
  return problems.sort((a, b) => rank(a.level) - rank(b.level));
}

function rank(level: AlertLevel): number {
  return level === 'alert' ? 0 : 1;
}
