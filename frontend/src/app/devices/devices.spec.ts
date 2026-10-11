import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';

import { DEVICES_REFRESH_MS, DeviceService } from './devices';

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

  it('reads the list again every few seconds, but not while the page is hidden', () => {
    let visibilityState: DocumentVisibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
    http.expectOne('/api/devices').flush({ devices: [{ id: 'local', name: '' }] });

    vi.advanceTimersByTime(DEVICES_REFRESH_MS);
    http.expectOne('/api/devices').flush({ devices: [{ id: 'local', name: '' }] });

    visibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(10 * DEVICES_REFRESH_MS);
    http.expectNone('/api/devices');

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
