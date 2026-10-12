import { DatePipe } from '@angular/common';
import { DOCUMENT, Component, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { I18n } from '../i18n/i18n';
import { HistoryStore } from './history-store';
import { DeviceCharts } from './history';
import { COLORS, dateTimeFormat, needsYear, stepCenter } from './line-chart';
import { TimelineLine, TimelineRow } from './timeline-row';

/** Where the choice of the timeline over the cards is kept between visits, in localStorage. */
export const TIMELINE_STORAGE_KEY = 'timeline';

/** Whether the page shows every value on one timeline instead of the cards; kept for the next visit. */
@Injectable({ providedIn: 'root' })
export class TimelineMode {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
  readonly on = signal(this.read());

  toggle(): void {
    this.on.update((on) => !on);
    try {
      this.storage?.setItem(TIMELINE_STORAGE_KEY, String(this.on()));
    } catch {
      // Without storage the choice lasts until the page is closed.
    }
  }

  private read(): boolean {
    try {
      return this.storage?.getItem(TIMELINE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}

/**
 * Every value of the picked device as one row, all over one time axis: the range picked at the top
 * of the page. Moving the pointer over any row shows a line across all rows and every value at
 * that time, so a CPU spike lines up with a disk write or a temperature rise.
 */
@Component({
  selector: 'app-timeline',
  imports: [DatePipe, TimelineRow],
  template: `
    @if (store.history(); as h) {
      @if (lines().length > 0) {
        <div class="axis" aria-hidden="true">
          <span>{{ h.from * 1000 | date: dateFormat() : undefined : i18n.language() }}</span>
          @if (shownCursor(); as time) {
            <span class="at">{{
              time * 1000 | date: dateFormat() : undefined : i18n.language()
            }}</span>
          }
          <span>{{ h.to * 1000 | date: dateFormat() : undefined : i18n.language() }}</span>
        </div>
        <div class="rows" role="list" [attr.aria-label]="i18n.t('timeline.label')">
          @for (line of lines(); track $index) {
            <app-timeline-row
              [line]="line"
              [from]="h.from"
              [to]="h.to"
              [step]="h.stepSeconds"
              [cursor]="shownCursor()"
              (hover)="cursor.set($event)"
            />
          }
        </div>
      }
    }
  `,
  styleUrl: './timeline.css',
  host: {
    '[style.--cursor]': 'cursorLeft()',
    '[style.--cursor-display]': "shownCursor() === null ? 'none' : 'block'",
  },
})
export class Timeline {
  protected readonly store = inject(HistoryStore);
  protected readonly i18n = inject(I18n);
  private readonly charts = inject(DeviceCharts).byCategory;

  /** The step under the pointer, or null while the pointer is elsewhere. */
  protected readonly cursor = signal<number | null>(null);

  /**
   * Each line of each chart, in the order of the categories; a chart of several names each line,
   * unless the line is named as the chart, such as the memory line of the memory chart.
   * Every strip fits its own values, without the chart's top, so a change shows in each row.
   */
  protected readonly lines = computed((): TimelineLine[] =>
    [...this.charts().values()].flat().flatMap((chart) =>
      chart.lines.map((line, index) => ({
        label:
          chart.lines.length > 1 && line.label !== chart.title
            ? `${chart.title} · ${line.label}`
            : chart.title,
        unit: chart.unit,
        points: line.points,
        series: index % COLORS,
      })),
    ),
  );

  /**
   * The step under the pointer while it is a step of the shown history; one left from before the
   * range or the device changed is not.
   */
  protected readonly shownCursor = computed(() => {
    const time = this.cursor();
    const history = this.store.history();
    const shown =
      time !== null &&
      history !== null &&
      time % history.stepSeconds === 0 &&
      time > history.from - history.stepSeconds &&
      time < history.to;
    return shown ? time : null;
  });

  /** Where the crosshair is, in the middle of the step under the pointer. */
  protected readonly cursorLeft = computed(() => {
    const time = this.shownCursor();
    const history = this.store.history();
    return time === null || !history
      ? null
      : `${stepCenter(time, history.from, history.to, history.stepSeconds)}%`;
  });

  protected readonly dateFormat = computed(() => {
    const history = this.store.history();
    const year = history !== null && needsYear(history.from, history.to);
    return this.i18n.t(dateTimeFormat(history !== null && history.stepSeconds < 60, year));
  });

  constructor() {
    this.store.watch.pipe(takeUntilDestroyed()).subscribe();
  }
}
