import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, filter, switchMap, take, tap, timer } from 'rxjs';

import { Device, DeviceService, LOCAL_DEVICE, notInUse } from '../devices/devices';

/** How long each device is shown on a wall display, unless the address says otherwise. */
export const KIOSK_SECONDS = 30;

/** The shortest time a device is shown, so a screen does not flicker from one to the next. */
export const MIN_KIOSK_SECONDS = 10;

/** The query string of the page's address; a token so tests can replace it. */
export const PAGE_SEARCH = new InjectionToken<string>('page search', {
  factory: () => inject(DOCUMENT).location?.search ?? '',
});

/**
 * How many seconds a wall display shows each device, from `?kiosk` or `?kiosk=60` in the page's
 * address; null when the page is not shown on a wall display.
 */
export function kioskSeconds(search: string): number | null {
  const value = new URLSearchParams(search).get('kiosk');
  if (value === null) {
    return null;
  }
  const seconds = Number(value);
  if (value.trim() === '' || !Number.isFinite(seconds)) {
    return KIOSK_SECONDS;
  }
  return Math.max(MIN_KIOSK_SECONDS, Math.round(seconds));
}

/** Whether a device has a problem: an alert, or it does not answer. */
function hasProblem(device: Device): boolean {
  return (device.alerts?.length ?? 0) > 0 || !!device.unreachable;
}

/**
 * The devices a wall display shows in turn: those with a problem first, then the others, each in
 * the order of the list. A PC or laptop that is switched off is left out, as it is just not in use.
 */
export function kioskOrder(devices: readonly Device[]): Device[] {
  const shown = devices.filter((d) => !notInUse(d));
  return [...shown.filter(hasProblem), ...shown.filter((d) => !hasProblem(d))];
}

/** The device a wall display shows after the one with id `current`. */
export function nextKioskDevice(devices: readonly Device[], current: string): string {
  const order = kioskOrder(devices);
  if (order.length === 0) {
    return LOCAL_DEVICE.id;
  }
  const index = order.findIndex((d) => d.id === current);
  return order[(index + 1) % order.length].id;
}

/**
 * The page as a wall display, with `?kiosk` in its address: without the sidebar and the buttons
 * that arrange the page, larger, with the alerts of every device on top, and on a hub showing
 * each device in turn. Nothing on it reacts to clicks or keys, so nobody changes it by accident.
 */
@Injectable({ providedIn: 'root' })
export class KioskMode {
  private readonly devices = inject(DeviceService);

  /** How long each device is shown, or null when the page is not a wall display. */
  readonly seconds = kioskSeconds(inject(PAGE_SEARCH));
  readonly on = this.seconds !== null;

  constructor() {
    if (this.on) {
      inject(DOCUMENT).documentElement.classList.add('kiosk');
    }
  }

  /**
   * On a wall display, shows the first device with a problem as soon as the list of devices is
   * read, and then the next device every few seconds while it is subscribed to.
   */
  readonly cycle: Observable<number> =
    this.seconds === null
      ? EMPTY
      : toObservable(this.devices.loaded).pipe(
          filter(Boolean),
          take(1),
          switchMap(() => timer(0, this.seconds! * 1000)),
          tap((tick) => {
            const devices = this.devices.devices();
            this.devices.comparing.set(false);
            this.devices.selectedId.set(
              tick === 0
                ? (kioskOrder(devices)[0]?.id ?? LOCAL_DEVICE.id)
                : nextKioskDevice(devices, this.devices.selectedId()),
            );
          }),
        );
}
