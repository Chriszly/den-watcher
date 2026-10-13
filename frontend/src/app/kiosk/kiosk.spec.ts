import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeferBlockState, TestBed } from '@angular/core/testing';

import { Alert } from '../alerts/alert';
import { App } from '../app';
import { Dashboard } from '../dashboard/dashboard';
import { Device, DeviceService, LOCAL_DEVICE } from '../devices/devices';
import { TIMELINE_STORAGE_KEY } from '../history/timeline';
import { I18n, LANGUAGE_STORAGE_KEY } from '../i18n/i18n';
import { PAGE_RELOAD } from '../update/missing-part';
import { KioskMode, PAGE_SEARCH, kioskOrder, kioskSeconds, nextKioskDevice } from './kiosk';

const disk: Alert = {
  id: 1,
  device: 'nas',
  deviceName: 'NAS',
  kind: 'disk',
  subject: '/',
  level: 'alert',
  value: 96,
  started: '2026-10-11T18:00:00Z',
};

const fleet: Device[] = [
  LOCAL_DEVICE,
  { id: 'pi', name: 'Pi', kind: 'server' },
  { id: 'laptop', name: 'Laptop', kind: 'pc', unreachable: true },
  { id: 'nas', name: 'NAS', kind: 'server', alerts: [disk] },
  { id: 'printer', name: 'Printer', checked: true, unreachable: true },
];

describe('kiosk', () => {
  it('reads the seconds from the address, at least 10 and at most a day', () => {
    expect(kioskSeconds('')).toBeNull();
    expect(kioskSeconds('?device=pi')).toBeNull();
    expect(kioskSeconds('?kiosk')).toBe(30);
    expect(kioskSeconds('?kiosk=')).toBe(30);
    expect(kioskSeconds('?kiosk=60')).toBe(60);
    expect(kioskSeconds('?kiosk=3')).toBe(10);
    expect(kioskSeconds('?kiosk=soon')).toBe(30);
    expect(kioskSeconds('?kiosk=86400')).toBe(86400);
    expect(kioskSeconds('?kiosk=3000000')).toBe(86400);
  });

  it('shows the devices with a problem first and leaves out a PC that is switched off', () => {
    expect(kioskOrder(fleet).map((d) => d.id)).toEqual(['nas', 'printer', 'local', 'pi']);
    expect(nextKioskDevice(fleet, 'local')).toBe('pi');
    expect(nextKioskDevice(fleet, 'pi')).toBe('nas');
    expect(nextKioskDevice(fleet, 'laptop')).toBe('nas');
  });
});

describe('KioskMode', () => {
  function setUp(search: string): { kiosk: KioskMode; devices: DeviceService } {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PAGE_SEARCH, useValue: search },
      ],
    });
    return { kiosk: TestBed.inject(KioskMode), devices: TestBed.inject(DeviceService) };
  }

  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.classList.remove('kiosk');
  });

  it('shows the first device with a problem once the list is read, then each in turn', () => {
    vi.useFakeTimers();
    const { kiosk, devices } = setUp('?kiosk=10');
    devices.comparing.set(true);
    const cycling = kiosk.cycle.subscribe();
    TestBed.tick();
    vi.advanceTimersByTime(20000);
    expect(devices.selectedId()).toBe('local');

    devices.devices.set(fleet);
    devices.loaded.set(true);
    TestBed.tick();
    vi.advanceTimersByTime(0);
    expect(devices.selectedId()).toBe('nas');
    expect(devices.comparing()).toBe(false);
    vi.advanceTimersByTime(9999);
    expect(devices.selectedId()).toBe('nas');
    vi.advanceTimersByTime(1);
    expect(devices.selectedId()).toBe('printer');
    vi.advanceTimersByTime(10000);
    expect(devices.selectedId()).toBe('local');

    cycling.unsubscribe();
    expect(document.documentElement.classList).toContain('kiosk');
  });

  it('is off without ?kiosk', () => {
    const { kiosk } = setUp('');

    expect(kiosk.on).toBe(false);
    expect(document.documentElement.classList).not.toContain('kiosk');
  });
});

describe('App on a wall display', () => {
  afterEach(() => {
    document.documentElement.classList.remove('kiosk');
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  });

  it('shows the device and every alert, without buttons, and takes no clicks', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PAGE_SEARCH, useValue: '?kiosk' },
      ],
    });
    TestBed.inject(I18n).use('en-GB');
    const devices = TestBed.inject(DeviceService);
    devices.devices.set(fleet);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // The alerts of every device are loaded only on a wall display.
    for (const block of await fixture.getDeferBlocks()) {
      await block.render(DeferBlockState.Complete);
    }
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-sidebar')).toBeNull();
    expect(element.querySelector('header button')).toBeNull();
    expect(element.querySelector('app-theme-toggle, app-language-switcher')).toBeNull();
    expect(element.querySelector('app-range-picker, app-arrange-bar')).toBeNull();
    expect(element.querySelector('header .device')?.textContent).toContain('Host Hub');
    expect(element.querySelector('app-kiosk-alerts')?.textContent).toContain(
      'NAS: Disk / is 96 % full',
    );
    expect(element.querySelector('main')?.hasAttribute('inert')).toBe(true);
  });

  it('stands in for the alerts when they cannot be loaded', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PAGE_SEARCH, useValue: '?kiosk' },
        { provide: PAGE_RELOAD, useValue: vi.fn() },
      ],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    for (const block of await fixture.getDeferBlocks()) {
      await block.render(DeferBlockState.Error);
    }
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-kiosk-alerts')).toBeNull();
    expect(element.querySelector('app-missing-part')).not.toBeNull();
  });

  it('shows the cards, not the timeline picked in this browser, and keeps that choice', () => {
    localStorage.setItem(TIMELINE_STORAGE_KEY, 'true');
    try {
      TestBed.configureTestingModule({
        imports: [App],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: PAGE_SEARCH, useValue: '?kiosk' },
        ],
      });
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;

      expect(element.querySelector('app-timeline')).toBeNull();
      expect(element.querySelector('.categories')).not.toBeNull();
      expect(localStorage.getItem(TIMELINE_STORAGE_KEY)).toBe('true');
    } finally {
      localStorage.removeItem(TIMELINE_STORAGE_KEY);
    }
  });

  it('reads the history of a device that does not answer, for its charts without cards', () => {
    vi.useFakeTimers();
    try {
      TestBed.configureTestingModule({
        imports: [Dashboard],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: PAGE_SEARCH, useValue: '?kiosk' },
        ],
      });
      const http = TestBed.inject(HttpTestingController);
      const fixture = TestBed.createComponent(Dashboard);
      fixture.detectChanges();
      vi.advanceTimersByTime(0);
      http.expectOne('/api/metrics').flush('down', { status: 502, statusText: 'Bad Gateway' });
      fixture.detectChanges();

      expect(http.match((r) => r.url === '/api/history').length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
