import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { History } from '../metrics/metrics';
import { TIMELINE_STORAGE_KEY, Timeline, TimelineMode } from './timeline';

const HISTORY: History = {
  from: 0,
  to: 300,
  stepSeconds: 100,
  retentionDays: 30,
  series: [
    {
      metric: 'cpu',
      points: [
        { time: 0, value: 10 },
        { time: 100, value: 50 },
        { time: 200, value: 20 },
      ],
    },
    { metric: 'memory', points: [{ time: 0, value: 40 }] },
    { metric: 'disk:/', points: [{ time: 200, value: 30 }] },
  ],
};

describe('Timeline', () => {
  let fixture: ComponentFixture<Timeline>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [Timeline],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Timeline);
  });

  function show(history: History = HISTORY): void {
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    http.expectOne((r) => r.url === '/api/history').flush(history);
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  function rows(): string[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('app-timeline-row'),
      (row) =>
        `${row.querySelector('.label')!.textContent!.trim()}: ${row.querySelector('.value')!.textContent!.trim()}`,
    );
  }

  function point(row: number, fraction: number): void {
    const strip = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      'app-timeline-row .strip',
    )[row];
    strip.getBoundingClientRect = () => ({ left: 0, width: 300 }) as DOMRect;
    strip.dispatchEvent(new PointerEvent('pointermove', { clientX: fraction * 300 }));
    fixture.detectChanges();
  }

  it('shows every value as a row with its latest value, in the order of the categories', () => {
    show();
    expect(rows()).toEqual([
      'CPU and memory · CPU: 20 %',
      'CPU and memory · Memory: 40 %',
      'Disks: 30 %',
    ]);
  });

  it('shows every value at the time under the pointer, with a line across all rows', () => {
    show();
    point(2, 0.5);
    expect(rows()).toEqual([
      'CPU and memory · CPU: 50 %',
      'CPU and memory · Memory: –',
      'Disks: –',
    ]);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.style.getPropertyValue('--cursor')).toBe('50%');
    expect(host.style.getPropertyValue('--cursor-display')).toBe('block');

    (host.querySelector('app-timeline-row .strip') as HTMLElement).dispatchEvent(
      new PointerEvent('pointerleave'),
    );
    fixture.detectChanges();
    expect(rows()[0]).toBe('CPU and memory · CPU: 20 %');
    expect(host.style.getPropertyValue('--cursor-display')).toBe('none');
  });

  it('forgets the time under the pointer once the range no longer has it', () => {
    show();
    point(0, 0.5);
    vi.advanceTimersByTime(5_000);
    http.expectOne((r) => r.url === '/api/history').flush({ ...HISTORY, from: 1000, to: 1300 });
    fixture.detectChanges();
    expect(rows()[0]).toBe('CPU and memory · CPU: 20 %');
    expect((fixture.nativeElement as HTMLElement).style.getPropertyValue('--cursor-display')).toBe(
      'none',
    );
  });

  it('colors the lines after the eighth from the start of the palette again', () => {
    show({
      ...HISTORY,
      series: Array.from({ length: 9 }, (_, i) => ({
        metric: `temperature:sensor${i}`,
        points: [{ time: 0, value: 40 }],
      })),
    });
    const strips = (fixture.nativeElement as HTMLElement).querySelectorAll('app-sparkline');
    expect(strips[8].classList).toContain('series-0');
  });

  it('shows nothing while the history holds no values', () => {
    show({ ...HISTORY, series: [] });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.axis')).toBeNull();
    expect(host.querySelector('app-timeline-row')).toBeNull();
  });
});

describe('TimelineMode', () => {
  afterEach(() => localStorage.removeItem(TIMELINE_STORAGE_KEY));

  it('is off until switched on, and remembers the choice', () => {
    expect(TestBed.inject(TimelineMode).on()).toBe(false);

    TestBed.inject(TimelineMode).toggle();
    expect(localStorage.getItem(TIMELINE_STORAGE_KEY)).toBe('true');

    TestBed.resetTestingModule();
    expect(TestBed.inject(TimelineMode).on()).toBe(true);
  });
});
