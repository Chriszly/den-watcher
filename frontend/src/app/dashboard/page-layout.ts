import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { filter, finalize } from 'rxjs';

import { PageVisibility } from '../page-visibility';

/** How the page is arranged, as GET and PUT /api/layout carry it. */
export interface Layout {
  /** The categories of cards that show only their title. */
  folded: string[];
}

type Change = (layout: Layout) => Layout;

/**
 * How the page is arranged, kept on the host so every browser that opens the page shows the same
 * arrangement. It is read again each time the page is shown, so a tab left open takes the changes
 * made in another browser before it sends its own. A change shows at once; it is sent to the host
 * over the newest layout read from it, so it never undoes a change made elsewhere.
 */
@Injectable({ providedIn: 'root' })
export class PageLayout {
  private readonly http = inject(HttpClient);
  private readonly current = signal<Layout>({ folded: [] });
  readonly layout = this.current.asReadonly();

  /** The changes made while the host's layout is being read, or before it has ever been read. */
  private pending: Change[] = [];
  private read = false;
  private reading = false;
  private sending = false;
  /** Whether the layout changed while it was being sent, so it is sent again after. */
  private changedWhileSending = false;

  constructor() {
    inject(PageVisibility)
      .visible.pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  /** Changes the layout and keeps it on the host. */
  change(change: Change): void {
    this.current.update(change);
    if (!this.read || this.reading) {
      this.pending.push(change);
    } else {
      this.send();
    }
  }

  private load(): void {
    // While a change is being sent, the page's layout is newer than the host's.
    if (this.reading || this.sending) {
      return;
    }
    this.reading = true;
    this.http
      .get<Layout>('/api/layout')
      .pipe(finalize(() => (this.reading = false)))
      .subscribe({
        next: (layout) => {
          this.read = true;
          const changes = this.pending;
          this.pending = [];
          this.current.set(
            changes.reduce((l, change) => change(l), {
              folded: Array.isArray(layout?.folded) ? layout.folded : [],
            }),
          );
          if (changes.length > 0) {
            this.send();
          }
        },
        // The changes wait for the host to answer when the page is shown next; until then they
        // last for this visit.
        error: () => undefined,
      });
  }

  /** Sends the layout to the host, one at a time, so an older one never lands after a newer one. */
  private send(): void {
    if (this.sending) {
      this.changedWhileSending = true;
      return;
    }
    this.sending = true;
    this.http
      .put('/api/layout', this.current())
      .pipe(
        finalize(() => {
          this.sending = false;
          if (this.changedWhileSending) {
            this.changedWhileSending = false;
            this.send();
          }
        }),
      )
      // A change the host cannot keep lasts for this visit.
      .subscribe({ error: () => undefined });
  }
}
