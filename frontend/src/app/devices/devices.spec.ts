import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';

import {
  DEVICES_HIDDEN_REFRESH_MS,
  DEVICES_REFRESH_MS,
  DeviceService,
  backupName,
} from './devices';

describe('DeviceService', () => {
  let http: HttpTestingController;
  let devices: DeviceService;
  let polling: Subscription;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    devices = TestBed.inject(DeviceService);
    polling = devices.polling.subscribe();
    vi.advanceTimersByTime(0);
  });

  afterEach(() => {
    polling.unsubscribe();
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reads the list again every few seconds, and only now and then while the page is hidden', () => {
    let visibilityState: DocumentVisibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
    http.expectOne('/api/devices').flush({ devices: [{ id: 'local', name: '' }] });

    vi.advanceTimersByTime(DEVICES_REFRESH_MS);
    http.expectOne('/api/devices').flush({ devices: [{ id: 'local', name: '' }] });

    visibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(DEVICES_HIDDEN_REFRESH_MS - 1);
    http.expectNone('/api/devices');
    vi.advanceTimersByTime(1);
    http.expectOne('/api/devices').flush({ devices: [{ id: 'local', name: '' }] });

    visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(0);
    http.expectOne('/api/devices').flush({
      devices: [
        { id: 'local', name: '' },
        { id: 'pi', name: 'Pi' },
      ],
    });
    expect(devices.devices().map((d) => d.id)).toEqual(['local', 'pi']);
    expect(devices.loaded()).toBe(true);
  });

  it('keeps only this device when the list cannot be read, and tries again', () => {
    http.expectOne('/api/devices').flush('down', { status: 502, statusText: 'Bad Gateway' });

    expect(devices.devices().map((d) => d.id)).toEqual(['local']);
    expect(devices.selected().id).toBe('local');

    vi.advanceTimersByTime(DEVICES_REFRESH_MS);
    http.expectOne('/api/devices').flush({ devices: [{ id: 'local', name: '' }] });
  });

  it('shows this device again when the picked one is removed', () => {
    devices.selectedId.set('pi');
    http.expectOne('/api/devices').flush({ devices: [{ id: 'local', name: '' }] });

    expect(devices.selectedId()).toBe('local');
  });
});

describe('backupName', () => {
  it('names a backup as the hub does, or with a name of its own', () => {
    expect(backupName('attachment; filename="den-watcher-2026-10-13.db"')).toBe(
      'den-watcher-2026-10-13.db',
    );
    expect(backupName('attachment; filename="../etc/passwd"')).toBe('den-watcher.db');
    expect(backupName(null)).toBe('den-watcher.db');
  });
});
