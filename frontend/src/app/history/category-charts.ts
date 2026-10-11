import { Component, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Category } from '../dashboard/categories';
import { EvenColumns } from '../layout/even-columns';
import { HistoryStore } from './history-store';
import { DeviceCharts } from './history';
import { LineChart } from './line-chart';

/** The charts of one category of the dashboard, over the range picked at the top of the page. */
@Component({
  selector: 'app-category-charts',
  imports: [EvenColumns, LineChart],
  template: `
    @if (store.history(); as h) {
      @if (charts().length > 0) {
        <div class="charts" appEvenColumns keepCardWidth>
          @for (chart of charts(); track $index) {
            <div class="card">
              <h3>{{ chart.title }}</h3>
              <app-line-chart
                [chartTitle]="chart.title"
                [lines]="chart.lines"
                [from]="h.from"
                [to]="h.to"
                [step]="h.stepSeconds"
                [unit]="chart.unit"
                [max]="chart.max"
              />
            </div>
          }
        </div>
      }
    }
  `,
  styleUrl: './category-charts.css',
})
export class CategoryCharts {
  readonly category = input.required<Category>();

  protected readonly store = inject(HistoryStore);
  private readonly deviceCharts = inject(DeviceCharts);
  protected readonly charts = computed(
    () => this.deviceCharts.byCategory().get(this.category()) ?? [],
  );

  constructor() {
    this.store.watch.pipe(takeUntilDestroyed()).subscribe();
  }
}
