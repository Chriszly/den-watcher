import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { History } from '../metrics/metrics';
import { CategoryCharts } from './category-charts';

const HISTORY: History = {
  from: 0,
  to: 1800,
  stepSeconds: 5,
  retentionDays: 30,
  series: [
    { metric: 'cpu', points: [{ time: 0, value: 12.5 }] },
    { metric: 'disk:/', points: [{ time: 0, value: 30 }] },
    { metric: 'disk.read:/', points: [{ time: 0, value: 1024 }] },
  ],
};

describe('CategoryCharts', () => {
  let fixture: ComponentFixture<CategoryCharts>;
  let http: HttpTestingController;
  let reportWidth: (width: number) => void;

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom has no ResizeObserver, which the chart grid uses to keep its rows even; tests report
    // the grid's width by hand.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: (entries: { contentRect: { width: number } }[]) => void) {
          reportWidth = (width) => callback([{ contentRect: { width } }]);
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    TestBed.configureTestingModule({
      imports: [CategoryCharts],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CategoryCharts);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function show(category: string): string[] {
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    http.expectOne((r) => r.url === '/api/history').flush(HISTORY);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h3'), (h) =>
      h.textContent!.trim(),
    );
  }

  it('shows the charts of its category only', () => {
    expect(show('storage')).toEqual(['Disks', 'Disk activity']);
  });

  it('shows nothing for a category without charts', () => {
    expect(show('programs')).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).querySelector('.charts')).toBeNull();
  });

  it('keeps a lone chart at the width it has in a full row', () => {
    show('system');
    reportWidth(1000);
    const charts = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.charts');
    expect(charts?.style.getPropertyValue('--columns')).toBe('2');
  });
});
