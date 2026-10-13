import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DeviceService } from '../devices/devices';
import { I18n } from '../i18n/i18n';
import { MetricsService } from '../metrics/metrics';

/** The name a download is saved as when the backend gives none. */
const FALLBACK_NAME = 'history.csv';

/**
 * The file name in a Content-Disposition header: the UTF-8 one (`filename*`) where there is one,
 * else the plain one (`filename`), else "history.csv". Only the name is kept, never a folder.
 */
export function fileNameOf(disposition: string | null): string {
  const encoded = /filename\*\s*=\s*UTF-8''([^;\s]+)/i.exec(disposition ?? '')?.[1];
  let name: string | undefined;
  if (encoded) {
    try {
      name = decodeURIComponent(encoded);
    } catch {
      name = undefined;
    }
  }
  name ??= /filename\s*=\s*"([^"]*)"/i.exec(disposition ?? '')?.[1];
  name = name?.split(/[/\\]/).pop()?.trim();
  return name || FALLBACK_NAME;
}

/**
 * A button that downloads the picked device's history from `from` to `to` as a CSV file, with a
 * column for each value and a row for each time, for a spreadsheet.
 */
@Component({
  selector: 'app-csv-download',
  template: `
    <button
      type="button"
      [disabled]="busy()"
      [title]="i18n.t('history.downloadCsvHint')"
      (click)="download()"
    >
      {{ i18n.t('history.downloadCsv') }}
    </button>
    @if (failed()) {
      <span class="failed" role="alert">{{ i18n.t('history.downloadFailed') }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    button {
      height: 2rem;
      padding: 0 0.75rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-small);
      background: transparent;
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-large);
      white-space: nowrap;
      cursor: pointer;
    }

    button:hover:not(:disabled) {
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
    }

    button:disabled {
      cursor: progress;
      opacity: 0.6;
    }

    button:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }

    .failed {
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class CsvDownload {
  /** The start of the stretch to download, in Unix seconds. */
  readonly from = input.required<number>();
  /** The end of the stretch to download, in Unix seconds. */
  readonly to = input.required<number>();

  protected readonly i18n = inject(I18n);
  private readonly metrics = inject(MetricsService);
  private readonly devices = inject(DeviceService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected download(): void {
    this.busy.set(true);
    this.failed.set(false);
    this.metrics
      .historyCsv(this.from(), this.to(), this.devices.selectedId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.busy.set(false);
          if (response.body) {
            this.save(response.body, fileNameOf(response.headers.get('Content-Disposition')));
          }
        },
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
        },
      });
  }

  /** Hands the file to the browser, which saves it under name as for any download. */
  private save(file: Blob, name: string): void {
    const url = URL.createObjectURL(file);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    // The browser has started the download by now; the file is not needed any longer.
    setTimeout(() => URL.revokeObjectURL(url));
  }
}
