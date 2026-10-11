import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceService } from '../devices/devices';
import { History, Snapshot } from '../metrics/metrics';
import { Compare, Row, largest, sortRows, summarize } from './compare';

const snapshot: Snapshot = {
  time: '2026-10-02T17:00:00Z',
  uptimeSeconds: 3 * 86400 + 4 * 3600,
  cpu: { usagePercent: 12.5, cores: 4 },
  memory: { totalBytes: 8 * 1024 ** 3, usedBytes: 2 * 1024 ** 3, usedPercent: 25 },
  temperatures: [
    { sensor: 'cpu_thermal', celsius: 48.3 },
    { sensor: 'nvme', celsius: 52.1 },
  ],
  disks: [
    { path: '/', totalBytes: 64 * 1024 ** 3, usedBytes: 16 * 1024 ** 3, usedPercent: 25 },
    { path: '/srv', totalBytes: 64 * 1024 ** 3, usedBytes: 60 * 1024 ** 3, usedPercent: 93.8 },
  ],
  network: [
    {
      name: 'eth0',
      receivedBytes: 0,
      sentBytes: 0,
      receiveBytesPerSecond: 1000,
      sendBytesPerSecond: 200,
    },
    {
      name: 'wlan0',
      receivedBytes: 0,
      sentBytes: 0,
      receiveBytesPerSecond: 24,
      sendBytesPerSecond: 0,
    },
  ],
};

/** What a router read over UPnP reports: only its network. */
const router: Snapshot = {
  ...snapshot,
  uptimeSeconds: 0,
  cpu: { usagePercent: 0, cores: 0 },
  memory: { totalBytes: 0, usedBytes: 0, usedPercent: 0 },
  temperatures: [],
  disks: [],
};

describe('summarize', () => {
  it('takes the fullest disk, the hottest sensor and the traffic of all network cards', () => {
    expect(summarize(snapshot)).toEqual({
      cpu: 12.5,
      memory: 25,
      disk: { path: '/srv', percent: 93.8 },
      temperature: { sensor: 'nvme', celsius: 52.1 },
      network: { receive: 1024, send: 200 },
      uptimeSeconds: 3 * 86400 + 4 * 3600,
    });
  });

  it('leaves out what a router does not report', () => {
    expect(summarize(router)).toEqual({
      cpu: undefined,
      memory: undefined,
      disk: undefined,
      temperature: undefined,
      network: { receive: 1024, send: 200 },
      uptimeSeconds: undefined,
    });
  });
});

describe('sortRows', () => {
  const row = (id: string, cpu?: number, alerts = 0): Row => ({
    device: {
      id,
      name: id,
      alerts: Array.from({ length: alerts }, (_, i) => ({
        id: i,
        device: id,
        deviceName: id,
        kind: 'disk' as const,
        level: 'warning' as const,
        started: '2026-10-02T17:00:00Z',
      })),
    },
    summary: cpu === undefined ? null : { cpu },
  });
  const ids = (rows: Row[]) => rows.map((r) => r.device.id);

  it('sorts largest first, with the devices without a value last', () => {
    const rows = [row('a', 10), row('b'), row('c', 80), row('d', 10)];
    expect(ids(sortRows(rows, 'cpu'))).toEqual(['c', 'a', 'd', 'b']);
    expect(ids(sortRows(rows, null))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sorts by the alerts, the most first', () => {
    expect(ids(sortRows([row('a', 1), row('b', 1, 2), row('c', 1, 1)], 'alerts'))).toEqual([
      'b',
      'c',
      'a',
    ]);
  });
});

describe('largest', () => {
  it('takes the largest of the series of a kind at each time', () => {
    expect(
      largest(
        [
          {
            metric: 'disk:/',
            points: [
              { time: 60, value: 20 },
              { time: 120, value: 30 },
            ],
          },
          { metric: 'disk:/srv', points: [{ time: 60, value: 90 }] },
          { metric: 'disk.read:/', points: [{ time: 60, value: 1e6 }] },
        ],
        'disk',
      ),
    ).toEqual([
      { time: 60, value: 90 },
      { time: 120, value: 30 },
    ]);
  });
});

describe('Compare', () => {
  let fixture: ComponentFixture<Compare>;
  let http: HttpTestingController;

  const history = (cpu: number): History => ({
    from: 0,
    to: 3600,
    stepSeconds: 60,
    retentionDays: 30,
    series: [{ metric: 'cpu', points: [{ time: 60, value: cpu }] }],
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    TestBed.configureTestingModule({
      imports: [Compare],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(DeviceService).devices.set([
      { id: 'local', name: 'Hub' },
      { id: 'router', name: 'Router', router: true },
      { id: 'pc', name: 'Office PC', kind: 'pc', unreachable: true },
      { id: 'printer', name: 'Printer', checked: true },
    ]);
    fixture = TestBed.createComponent(Compare);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function answer(): void {
    http.expectOne('/api/metrics').flush(snapshot);
    http.expectOne('/api/metrics?device=router').flush(router);
    http.expectOne('/api/metrics?device=printer').flush('down', { status: 503, statusText: 'x' });
    const cpu: Record<string, number> = { local: 40, router: 0, pc: 70 };
    const requests = http.match((r) => r.url === '/api/history');
    expect(requests.map((r) => r.request.params.get('device') ?? 'local')).toEqual([
      'local',
      'router',
      'pc',
    ]);
    for (const r of requests) {
      r.flush(history(cpu[r.request.params.get('device') ?? 'local']));
    }
    fixture.detectChanges();
  }

  function rows(): string[][] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'), (tr) =>
      Array.from(tr.querySelectorAll('th, td'), (cell) =>
        cell.textContent!.replace(/\s+/g, ' ').trim(),
      ),
    );
  }

  it('shows the values of every device, and why a device has none', () => {
    answer();
    expect(rows()).toEqual([
      [
        'Hub',
        '12.5 %',
        '25.0 %',
        '93.8 % /srv',
        '52.1 °C nvme',
        '↓ 1.0 KiB/s↑ 200 B/s',
        '3 d 4 h',
        '–',
      ],
      ['Router', '–', '–', '–', '–', '↓ 1.0 KiB/s↑ 200 B/s', '–', '–'],
      ['Office PC', 'Not in use', '–'],
      ['Printer', 'Not reachable', '–'],
    ]);
  });

  it('sorts by a column, largest first, and back', () => {
    answer();
    const header = (name: string) =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('thead button'),
      ).find((b) => b.textContent!.trim() === name)!;
    header('Network').click();
    fixture.detectChanges();
    expect(rows().map((r) => r[0])).toEqual(['Hub', 'Router', 'Office PC', 'Printer']);
    header('CPU').click();
    fixture.detectChanges();
    expect(rows().map((r) => r[0])).toEqual(['Hub', 'Router', 'Office PC', 'Printer']);
    expect(header('CPU ↓').getAttribute('aria-pressed')).toBe('true');
  });

  it('charts a line per device that reports the value, leaving out checks', () => {
    answer();
    const titles = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.charts h3'),
      (h) => h.textContent!.trim(),
    );
    expect(titles).toEqual(['CPU']);
  });

  it('shows a device on its own when its name is picked', () => {
    answer();
    const devices = TestBed.inject(DeviceService);
    devices.comparing.set(true);
    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('tbody .device')[1]
      .click();
    expect(devices.selectedId()).toBe('router');
    expect(devices.comparing()).toBe(false);
  });
});
