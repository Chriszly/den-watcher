import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DeviceService } from '../devices/devices';
import { I18n } from '../i18n/i18n';
import { History, Point } from '../metrics/metrics';
import {
  DiskForecast,
  DiskForecasts,
  FORECAST_REFRESH_MS,
  daysUntilFull,
  risePerDay,
  risesOf,
} from './disk-forecast';

const DAY = 86400;

/** Hourly points over days, from start percent rising by perDay a day, plus wobble. */
function rising(days: number, start: number, perDay: number, wobble = () => 0): Point[] {
  return Array.from({ length: days * 24 + 1 }, (_, i) => ({
    time: 1_000_000 + i * 3600,
    value: start + (perDay * i) / 24 + wobble(),
  }));
}

function historyOf(series: Record<string, Point[]>, lastReading?: number): History {
  return {
    from: 0,
    to: 1,
    stepSeconds: 3600,
    retentionDays: 30,
    series: Object.entries(series).map(([metric, points]) => ({ metric, points })),
    lastReading,
  };
}

describe('risePerDay', () => {
  it('fits a straight line through a steady rise', () => {
    expect(risePerDay(rising(7, 50, 2))).toBeCloseTo(2, 6);
    let i = 0;
    expect(risePerDay(rising(7, 50, 1, () => (i++ % 2 ? 0.2 : -0.2)))).toBeCloseTo(1, 1);
  });

  it('makes no forecast from less than a day, a flat or falling disk, or an unsteady one', () => {
    expect(risePerDay(rising(0.5, 50, 5))).toBeNull();
    expect(risePerDay(rising(7, 50, 0))).toBeNull();
    expect(risePerDay(rising(7, 50, -1))).toBeNull();
    // One large copy on an otherwise even disk.
    const jump = rising(7, 50, 0).map((p, i, all) => ({
      ...p,
      value: i === all.length - 1 ? 70 : 50 + (i % 2) * 0.5,
    }));
    expect(risePerDay(jump)).toBeNull();
    expect(risePerDay([])).toBeNull();
  });
});

describe('daysUntilFull', () => {
  it('tells the days left at the pace, but nothing past a year or for a full disk', () => {
    expect(daysUntilFull(2, 80)).toBe(10);
    expect(daysUntilFull(0.1, 50)).toBeNull();
    expect(daysUntilFull(1, 100)).toBeNull();
    expect(daysUntilFull(0, 50)).toBeNull();
  });
});

describe('risesOf', () => {
  it('takes the disks that rise steadily, by their path', () => {
    const rises = risesOf(
      historyOf({
        'disk:/': rising(7, 30, 0),
        'disk:C:\\': rising(7, 30, 3),
        cpu: rising(7, 10, 5),
      }),
    );
    expect([...rises.keys()]).toEqual(['C:\\']);
    expect(rises.get('C:\\')).toBeCloseTo(3, 6);
  });

  it('forecasts nothing for a device that does not answer', () => {
    expect(risesOf(historyOf({ 'disk:/': rising(7, 30, 3) }, 1_500_000)).size).toBe(0);
  });
});

@Component({
  imports: [DiskForecast],
  template: `<app-disk-forecast [path]="path()" [percent]="percent()" />`,
})
class Host {
  readonly path = signal('/');
  readonly percent = signal(80);
}

describe('DiskForecast', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  function tick(ms = 0): void {
    TestBed.tick();
    vi.advanceTimersByTime(ms);
  }

  const reads = () => http.match((r) => r.url === '/api/history');

  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    tick();
    return fixture;
  }

  it('reads the last week and tells when a steadily filling disk is full, as a warning when soon', () => {
    const fixture = render();
    const [request] = reads();
    const from = Number(request.request.params.get('from'));
    const to = Number(request.request.params.get('to'));
    expect(to - from).toBe(7 * DAY);
    request.flush(historyOf({ 'disk:/': rising(7, 66, 2) }));
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const text = () => element.querySelector('p')?.textContent?.trim();
    expect(text()).toBe('Full in about 10 days');
    expect(element.querySelector('p')!.classList).toContain('soon');
    expect(element.querySelector('app-alert-icon')).not.toBeNull();

    fixture.componentInstance.percent.set(70);
    fixture.detectChanges();
    expect(text()).toBe('Full in about 15 days');
    expect(element.querySelector('p')!.classList).not.toContain('soon');
    expect(element.querySelector('app-alert-icon')).toBeNull();

    fixture.componentInstance.percent.set(99.8);
    fixture.detectChanges();
    expect(text()).toBe('Full in about 1 day');

    TestBed.inject(I18n).language.set('de');
    fixture.componentInstance.percent.set(70);
    fixture.detectChanges();
    expect(text()).toBe('Voll in etwa 15 Tagen');

    fixture.componentInstance.path.set('/srv');
    fixture.detectChanges();
    expect(element.querySelector('p')).toBeNull();
  });

  it('reads each device at most once an hour, and not at all while nothing shows a disk', () => {
    const fixture = render();
    reads()[0].flush(historyOf({ 'disk:/': rising(7, 66, 2) }));

    vi.advanceTimersByTime(FORECAST_REFRESH_MS - 60_000);
    expect(reads()).toEqual([]);

    // Another device is read at once; going back to the first one reads nothing new.
    const devices = TestBed.inject(DeviceService);
    devices.selectedId.set('nas');
    tick();
    const [nas] = reads();
    expect(nas.request.params.get('device')).toBe('nas');
    nas.flush(historyOf({}));
    devices.selectedId.set('local');
    tick();
    expect(reads()).toEqual([]);
    fixture.detectChanges();
    expect(TestBed.inject(DiskForecasts).rises().has('/')).toBe(true);

    vi.advanceTimersByTime(60_000);
    const [again, ...more] = reads();
    expect(more).toEqual([]);
    again.flush(historyOf({}));

    fixture.destroy();
    vi.advanceTimersByTime(2 * FORECAST_REFRESH_MS);
    expect(reads()).toEqual([]);
  });
});
