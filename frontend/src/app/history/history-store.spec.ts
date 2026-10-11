import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DeviceService } from '../devices/devices';
import { History } from '../metrics/metrics';
import { HistoryStore } from './history-store';

const HISTORY: History = {
  from: 0,
  to: 1800,
  stepSeconds: 5,
  retentionDays: 30,
  series: [{ metric: 'cpu', points: [{ time: 0, value: 12.5 }] }],
};

describe('HistoryStore', () => {
  let store: HistoryStore;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(HistoryStore);
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

  it('reads once for all watchers, and only while something watches', () => {
    const first = store.watch.subscribe();
    const second = store.watch.subscribe();
    tick();
    const [request, ...more] = reads();
    expect(more).toEqual([]);
    request.flush(HISTORY);
    expect(store.history()).toEqual(HISTORY);

    tick(5_000);
    expect(reads().length).toBe(1);

    first.unsubscribe();
    second.unsubscribe();
    tick(60_000);
    expect(reads()).toEqual([]);
  });

  it('drops the history of the device it showed when another one is picked', () => {
    const watching = store.watch.subscribe();
    tick();
    reads()[0].flush(HISTORY);

    TestBed.inject(DeviceService).selectedId.set('nas');
    tick();
    expect(store.history()).toBeNull();
    const [request] = reads();
    expect(request.request.params.get('device')).toBe('nas');

    watching.unsubscribe();
  });
});
