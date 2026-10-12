import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { History } from '../metrics/metrics';
import { CardCharts } from './card-charts';
import { Chart } from './history';
import { RangePicker } from './range-picker';

const HISTORY: History = { from: 0, to: 1800, stepSeconds: 5, retentionDays: 30, series: [] };

const DISKS: Chart = {
  title: 'Disks',
  category: 'storage',
  card: 'disks',
  unit: 'percent',
  max: 100,
  lines: [{ label: '/', points: [{ time: 0, value: 30 }] }],
};

describe('CardCharts', () => {
  let fixture: ComponentFixture<CardCharts>;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [CardCharts, RangePicker],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    // The range picker reads the history; the charts only show it.
    TestBed.createComponent(RangePicker).detectChanges();
    fixture = TestBed.createComponent(CardCharts);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  function show(charts: Chart[]): HTMLElement {
    fixture.componentRef.setInput('charts', charts);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    http.expectOne((r) => r.url === '/api/history').flush(HISTORY);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('draws a lone chart without a title, as the card names it', () => {
    const element = show([DISKS]);
    expect(element.querySelectorAll('app-line-chart').length).toBe(1);
    expect(element.querySelector('h4')).toBeNull();
  });

  it('names each chart when the card has several', () => {
    const element = show([DISKS, { ...DISKS, title: 'Disk activity' }]);
    expect([...element.querySelectorAll('h4')].map((h) => h.textContent!.trim())).toEqual([
      'Disks',
      'Disk activity',
    ]);
  });

  it('names a chart by its part of the card where it has one', () => {
    const element = show([
      DISKS,
      { ...DISKS, title: 'Kernel: TCP · Retransmissions', part: 'Retransmissions' },
    ]);
    expect(element.querySelectorAll('h4')[1].textContent!.trim()).toBe('Retransmissions');
  });

  it('has no width button outside a grid of cards', () => {
    const element = show([DISKS]);
    expect(element.querySelector('button.widen')).toBeNull();
  });

  it('shows nothing, not even the button, without charts', () => {
    const element = show([]);
    expect(element.querySelector('app-line-chart')).toBeNull();
    expect(element.querySelector('button')).toBeNull();
  });
});
