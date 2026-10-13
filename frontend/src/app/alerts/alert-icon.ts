import { Component, input } from '@angular/core';

import { AlertLevel } from './alert';

/** A round sign with an exclamation mark: red for an alert, amber for a warning. */
@Component({
  selector: 'app-alert-icon',
  template: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="11" />
    <rect x="10.5" y="5" width="3" height="9" rx="1.5" />
    <circle cx="12" cy="18" r="1.75" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      width: var(--alert-icon-size, 1.25rem);
      height: var(--alert-icon-size, 1.25rem);
      vertical-align: middle;
    }

    svg {
      width: 100%;
      height: 100%;
    }

    circle:first-child {
      fill: var(--alert-color);
    }

    rect,
    circle:last-child {
      fill: var(--alert-on-color);
    }

    :host {
      --alert-color: var(--alert-level);
      --alert-on-color: #fff;
    }

    :host(.warning) {
      --alert-color: var(--warning-level);
      --alert-on-color: light-dark(#fff, #1b1300);
    }

    @media (forced-colors: active) {
      circle:first-child {
        fill: CanvasText;
      }

      rect,
      circle:last-child {
        fill: Canvas;
      }
    }
  `,
  host: { '[class.warning]': "level() === 'warning'" },
})
export class AlertIcon {
  readonly level = input<AlertLevel>('alert');
}
