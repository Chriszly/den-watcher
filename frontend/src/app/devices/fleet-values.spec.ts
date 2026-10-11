import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DeviceService } from './devices';
import { FleetValues } from './fleet-values';

describe('FleetValues', () => {
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

  it('reads each answering device once for all watchers, and none while nobody watches', () => {
    TestBed.inject(DeviceService).devices.set([
      { id: 'local', name: '' },
      { id: 'pi', name: 'Pi' },
      { id: 'laptop', name: 'Laptop', kind: 'pc', unreachable: true },
    ]);
    const fleet = TestBed.inject(FleetValues);
    const first = fleet.watch.subscribe();
    const second = fleet.watch.subscribe();
    vi.advanceTimersByTime(0);

    const requests = http.match((r) => r.url === '/api/metrics');
    expect(requests.map((r) => r.request.params.get('device') ?? 'local')).toEqual(['local', 'pi']);
    requests[0].flush('down', { status: 502, statusText: 'Bad Gateway' });
    requests[1].flush({
      time: '2026-10-11T12:00:00Z',
      uptimeSeconds: 60,
      cpu: { usagePercent: 20, cores: 4 },
      memory: { totalBytes: 100, usedBytes: 50, usedPercent: 50 },
      temperatures: [],
      disks: [],
      network: [],
    });
    expect(fleet.summaries().get('local')).toBeNull();
    expect(fleet.summaries().get('pi')?.cpu).toBe(20);

    first.unsubscribe();
    second.unsubscribe();
    vi.advanceTimersByTime(60_000);
    http.expectNone((r) => r.url === '/api/metrics');
  });
});
