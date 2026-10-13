import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TimeoutError, tap, timeout } from 'rxjs';

/**
 * Whether the hub the page was loaded from still answers. All values, those of
 * other devices too, come through it, so while it does not answer nothing on
 * the page is live. The page's own polls keep asking it, and the first answer
 * ends that state; nothing extra is sent to find out.
 */
@Injectable({ providedIn: 'root' })
export class HubConnection {
  /** When the hub stopped answering; null while it answers. */
  readonly lostSince = signal<Date | null>(null);
  readonly lost = computed(() => this.lostSince() !== null);

  /** Notes a request the hub did not answer; the time of the first one is kept. */
  failed(): void {
    if (!this.lostSince()) {
      this.lostSince.set(new Date());
    }
  }

  /** Notes an answer from the hub, an error it sent back too. */
  answered(): void {
    if (this.lostSince()) {
      this.lostSince.set(null);
    }
  }
}

/**
 * How long the hub has to answer a request to the API. The server cuts off an
 * answer after 10 seconds, so a request still open after 15 got no answer:
 * without a limit, a hub that lost power while the browser kept a connection
 * to it open leaves the request hanging for many minutes, and the polls that
 * wait for it never notice the hub is gone.
 */
export const ANSWER_TIMEOUT_MS = 15_000;

/**
 * How long the hub has to answer a change to the devices: longer than a read,
 * so a change that is still being made is not given up and then looks as if
 * it failed, but still limited, so a hub that is gone is noticed.
 */
export const CHANGE_TIMEOUT_MS = 30_000;

/**
 * How long the hub has to send a backup: it gives itself 10 minutes to copy
 * and send a database that can be hundreds of megabytes, so a shorter limit
 * would cut off a backup it is still sending; a minute more, and it has given
 * up, or lost power while sending.
 */
export const BACKUP_TIMEOUT_MS = 11 * 60_000;

/** Whether a request failed as the hub did not answer it, rather than with an error the hub sent. */
export function unanswered(error: unknown): boolean {
  return (
    error instanceof TimeoutError ||
    (error instanceof HttpErrorResponse && [0, 502, 504].includes(error.status))
  );
}

/**
 * Tells the HubConnection whether each request reached the hub. Without an
 * answer the browser reports status 0, and a proxy in front of the hub 502 or
 * 504; any other status was sent by the hub itself. A request to the API that
 * gets no answer in time is given up with a TimeoutError, which counts as no
 * answer too; a change is given more time than a read, and a backup more
 * still.
 */
export const hubConnectionInterceptor: HttpInterceptorFn = (request, next) => {
  const connection = inject(HubConnection);
  const sent = next(request);
  // The request is sent at once; the time runs until the answer arrives.
  const limit =
    request.url === '/api/backup'
      ? BACKUP_TIMEOUT_MS
      : request.method === 'GET'
        ? ANSWER_TIMEOUT_MS
        : CHANGE_TIMEOUT_MS;
  const limited = request.url.startsWith('/api/') ? sent.pipe(timeout({ each: limit })) : sent;
  return limited.pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          connection.answered();
        }
      },
      error: (error: unknown) => {
        if (unanswered(error)) {
          connection.failed();
        } else {
          connection.answered();
        }
      },
    }),
  );
};
