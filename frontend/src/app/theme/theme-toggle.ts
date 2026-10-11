import { Component, computed, inject } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { ThemeService } from './theme';

/** Switches between light and dark: a sun while the page is dark, a moon while it is light. */
@Component({
  selector: 'app-theme-toggle',
  template: `
    <button type="button" [attr.aria-label]="label()" [title]="label()" (click)="theme.toggle()">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        @if (theme.scheme() === 'dark') {
          <circle cx="12" cy="12" r="4.5" />
          <path
            class="rays"
            d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"
          />
        } @else {
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
        }
      </svg>
    </button>
  `,
  styles: `
    button {
      display: flex;
      padding: 0.375rem;
      border: none;
      border-radius: 50%;
      background: none;
      color: var(--mat-sys-on-surface-variant);
      cursor: pointer;
    }

    button:hover {
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }

    button:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
    }

    svg {
      width: 1.25rem;
      height: 1.25rem;
      fill: currentColor;
    }

    .rays {
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
    }
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  private readonly i18n = inject(I18n);

  protected readonly label = computed(() =>
    this.i18n.t(this.theme.scheme() === 'dark' ? 'app.switchToLight' : 'app.switchToDark'),
  );
}
