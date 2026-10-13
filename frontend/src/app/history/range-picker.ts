import { DatePipe, formatDate } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HubConnection } from '../connection/connection';
import { I18n } from '../i18n/i18n';
import { CsvDownload } from './csv-download';
import { DeviceCharts } from './history';
import { HistoryStore } from './history-store';
import { dateTimeFormat, needsYear } from './line-chart';

/**
 * Picks the stretch of time every chart on the page shows: a unit (minutes, hours, days or all) and
 * then a range of that unit, with the period it covers. For a device that is not answering, the
 * backend moves the stretch back to end at its last reading, and a notice says the charts are not
 * live; where nothing was recorded in the stretch, a line says so.
 */
@Component({
  selector: 'app-range-picker',
  imports: [CsvDownload, DatePipe],
  templateUrl: './range-picker.html',
  styleUrl: './range-picker.css',
})
export class RangePicker {
  protected readonly store = inject(HistoryStore);
  protected readonly i18n = inject(I18n);
  protected readonly charts = inject(DeviceCharts).byCategory;
  /** While the hub does not answer, the banner across the page says the charts are not live. */
  protected readonly connection = inject(HubConnection);

  /** Short ranges show seconds too, and long ranges or ranges into another year the year. */
  protected readonly dateFormat = computed(() => {
    const history = this.store.history();
    const year = history !== null && needsYear(history.from, history.to);
    return this.i18n.t(dateTimeFormat(this.store.span() <= 30 * 60, year));
  });

  /** For a device that is not answering, when the shown data ends, in the page's language. */
  protected readonly lastReading = computed(() => {
    const last = this.store.history()?.lastReading;
    return last ? formatDate(last * 1000, 'short', this.i18n.language()) : null;
  });

  constructor() {
    this.store.watch.pipe(takeUntilDestroyed()).subscribe();
  }
}
