import { Component, input } from '@angular/core';

import { DeviceState } from './devices';

/**
 * In place of a check mark, a dot before a device's name: green while the device answers, red
 * while it does not, and grey for a PC or laptop that is switched off, which is no outage. While
 * the hub does not answer, the other devices get a hollow dot: nothing is known about them.
 */
@Component({
  selector: 'app-status-dot',
  template: '',
  styles: `
    :host {
      display: inline-block;
      flex: none;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      vertical-align: middle;
      background: light-dark(#1b873f, #3fb950);
    }

    :host(.unreachable) {
      background: light-dark(#c62828, #f85149);
    }

    :host(.notInUse) {
      background: var(--mat-sys-outline);
    }

    :host(.unknown) {
      background: none;
      box-shadow: inset 0 0 0 1.5px var(--mat-sys-outline);
    }
  `,
  host: { '[class]': 'state()', 'aria-hidden': 'true' },
})
export class StatusDot {
  readonly state = input.required<DeviceState>();
}
