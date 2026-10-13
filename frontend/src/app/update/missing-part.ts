import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { ANSWER_TIMEOUT_MS, HubConnection, unanswered } from '../connection/connection';
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
 * problem, and the page is not reloaded again, so it never reloads over and over. Nor is it
 * reloaded while the hub does not answer, as when it restarts: the browser would show its own
 * error page in place of this one, and the connection banner already says what is wrong.
 */
@Injectable({ providedIn: 'root' })
export class MissingParts {
  private readonly storage = inject(DOCUMENT).defaultView?.sessionStorage;
  private readonly reloadPage = inject(PAGE_RELOAD);
  private readonly connection = inject(HubConnection);
  private readonly http = inject(HttpClient);

  /** Whether a part loaded with load() is missing and the page was not reloaded for it. */
  readonly missing = signal(false);

  /** Loads a part of the page; one that cannot be loaded reloads the page, once. */
  async load<T>(part: () => Promise<T>): Promise<T> {
    try {
      const loaded = await part();
      this.missing.set(false);
      return loaded;
    } catch (error) {
      if (!(await this.reload())) {
        this.missing.set(true);
      }
      throw error;
    }
  }

  /**
   * Reloads the page unless it was reloaded for a missing part within a minute or the hub does not
   * answer; true if it does.
   */
  async reload(): Promise<boolean> {
    if (!this.mayReload() || this.connection.lost() || !(await this.hubAnswers())) {
      return false;
    }
    try {
      this.storage?.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
    } catch {
      return false;
    }
    this.reloadPage();
    return true;
  }

  /** Whether the page was not reloaded for a missing part within a minute. */
  private mayReload(): boolean {
    try {
      const last = Number(this.storage?.getItem(RELOAD_STORAGE_KEY));
      return !!this.storage && Date.now() - last >= RELOAD_GUARD_MS;
    } catch {
      // Without storage a reload could not be told from the one before, so none is tried.
      return false;
    }
  }

  /**
   * Whether the hub answers, so a reload shows a page: a part can be missing only because the hub
   * just went away, before the page's polls noticed. The answer, or its lack, tells the
   * HubConnection too.
   */
  private async hubAnswers(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.head('/', { responseType: 'text' }).pipe(timeout({ each: ANSWER_TIMEOUT_MS })),
      );
      return true;
    } catch (error) {
      return !unanswered(error);
    }
  }
}

/**
 * Stands in for a part of the page that could not be loaded: it reloads the page once, and says so
 * if the part is still missing after that, or if the page is not reloaded as the hub does not
 * answer.
 */
@Component({
  selector: 'app-missing-part',
  template: `
    @if (reloading() === false) {
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
  /** Whether the page reloads; null while that is being found out. */
  protected readonly reloading = signal<boolean | null>(null);

  constructor() {
    void inject(MissingParts)
      .reload()
      .then((reloading) => this.reloading.set(reloading));
  }
}
