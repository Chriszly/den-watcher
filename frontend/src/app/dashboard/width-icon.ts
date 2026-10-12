import { Component, input } from '@angular/core';

/** The icon of a button that makes a card wider, or narrow again with `narrower`. */
@Component({
  selector: 'app-width-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      @if (narrower()) {
        <path d="M4 14h6v6M20 10h-6V4M14 10l6.5-6.5M10 14l-6.5 6.5" />
      } @else {
        <path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: contents;
    }

    svg {
      width: var(--width-icon, 1.125rem);
      height: var(--width-icon, 1.125rem);
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class WidthIcon {
  readonly narrower = input(false);
}
