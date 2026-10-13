import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DeviceService, LOCAL_DEVICE } from '../devices/devices';
import { Alert } from './alert';
import { AlertTab, withDot } from './alert-tab';

const disk: Alert = {
  id: 1,
  device: 'nas',
  deviceName: 'NAS',
  kind: 'disk',
  subject: '/',
  level: 'warning',
  value: 91,
  started: '2026-10-11T18:00:00Z',
};

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle r="4"/></svg>';

describe('AlertTab', () => {
  let link: HTMLLinkElement;
  let title: string;

  beforeEach(() => {
    title = document.title;
    document.title = 'Den-Watcher';
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    link.remove();
    document.title = title;
  });

  it('shows the number of alerts in the title and their worst level as a dot on the favicon', () => {
    const tab = TestBed.inject(AlertTab);
    const devices = TestBed.inject(DeviceService);
    tab.icon.set(ICON);
    TestBed.tick();
    expect(document.title).toBe('Den-Watcher');
    expect(decodeURIComponent(link.href)).toContain(ICON);

    devices.devices.set([LOCAL_DEVICE, { id: 'nas', name: 'NAS', alerts: [disk] }]);
    TestBed.tick();
    expect(document.title).toBe('(1) Den-Watcher');
    expect(decodeURIComponent(link.href)).toContain('#f0a030');

    devices.devices.set([
      LOCAL_DEVICE,
      { id: 'nas', name: 'NAS', alerts: [disk, { ...disk, id: 2, level: 'alert' }] },
    ]);
    TestBed.tick();
    expect(document.title).toBe('(2) Den-Watcher');
    expect(decodeURIComponent(link.href)).toContain('#e5372b');

    devices.devices.set([LOCAL_DEVICE, { id: 'nas', name: 'NAS' }]);
    TestBed.tick();
    expect(document.title).toBe('Den-Watcher');
    expect(decodeURIComponent(link.href)).toBe(`data:image/svg+xml,${ICON}`);
  });

  it('draws the dot last, over the icon', () => {
    expect(withDot(ICON, null)).toBe(ICON);
    expect(withDot(ICON, 'alert')).toMatch(/<circle r="4"\/><circle cx="25" [^>]*\/><\/svg>$/);
  });
});
