import { DOCUMENT } from '@angular/common';
import { Component, Injectable, InjectionToken, inject } from '@angular/core';

import { I18n } from '../i18n/i18n';

/** Where the time of the last reload for a missing part is kept, in this tab's sessionStorage. */
export const RELOAD_STORAGE_KEY = 'reloadedForMissingPart';

/** How long after a reload for a missing part the page is not reloaded for one again. */
export const RELOAD_GUARD_MS = 60_000;

/** Reloads the page; a token so tests can replace it. */
export const PAGE_RELOAD = new InjectionToken<() => void>('page reload', {
  factory: () => {
    const location = inject(DOCUMENT).location;
    return () => location.reload();
  },
});

/**
 * Reloads the page once when a part of it that is loaded only when needed, such as the comparison
 * or a dialog, cannot be loaded. After an update the hub serves the new build, whose parts are
 * named differently, so a tab opened before cannot load the parts it has not loaded yet; the
 * reload takes the new build. A part still missing within a minute of a reload is a different
 * problem, and the page is not reloaded again, so it never reloads over and over.
 */
@Injectable({ providedIn: 'root' })
export class MissingParts {
  private readonly storage = inject(DOCUMENT).defaultView?.sessionStorage;
  private readonly reloadPage = inject(PAGE_RELOAD);

  /** Loads a part of the page; one that cannot be loaded reloads the page, once. */
  async load<T>(part: () => Promise<T>): Promise<T> {
    try {
      return await part();
    } catch (error) {
      this.reload();
      throw error;
    }
  }

  /** Reloads the page unless it was reloaded for a missing part within a minute; true if it does. */
  reload(): boolean {
    try {
      const last = Number(this.storage?.getItem(RELOAD_STORAGE_KEY));
      if (!this.storage || Date.now() - last < RELOAD_GUARD_MS) {
        return false;
      }
      this.storage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
    } catch {
      // Without storage a reload could not be told from the one before, so none is tried.
      return false;
    }
    this.reloadPage();
    return true;
  }
}

/**
 * Stands in for a part of the page that could not be loaded: it reloads the page once, and says so
 * if the part is still missing after that.
 */
@Component({
  selector: 'app-missing-part',
  template: `
    @if (!reloading) {
      <p class="missing" role="alert">{{ i18n.t('update.partMissing') }}</p>
    }
  `,
  styles: `
    .missing {
      margin: 0 0 1rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class MissingPart {
  protected readonly i18n = inject(I18n);
  protected readonly reloading = inject(MissingParts).reload();
}
