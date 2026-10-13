import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DeviceService, LOCAL_DEVICE } from '../devices/devices';
import { Alert } from './alert';
import { AlertChips } from './alert-chips';

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

describe('AlertChips', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(DeviceService).devices.set([
      LOCAL_DEVICE,
      { id: 'nas', name: 'Storage', alerts: [disk] },
    ]);
  });

  function render(alerts: readonly Alert[], withDevice: boolean): HTMLElement {
    const fixture = TestBed.createComponent(AlertChips);
    fixture.componentRef.setInput('alerts', alerts);
    fixture.componentRef.setInput('withDevice', withDevice);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('shows each alert with its level', () => {
    const element = render([disk, { ...disk, id: 2, kind: 'memory', level: 'alert' }], false);
    const chips = element.querySelectorAll('li');

    expect(element.querySelector('ul')?.getAttribute('role')).toBe('alert');
    expect(chips.length).toBe(2);
    expect(chips[0].classList).toContain('warning');
    expect(chips[1].classList).not.toContain('warning');
    expect(element.querySelector('.device')).toBeNull();
  });

  it('names the device of each alert as the page names it now', () => {
    const element = render([disk], true);

    expect(element.querySelector('.device')?.textContent).toBe('Storage:');
  });

  it('shows nothing without alerts', () => {
    expect(render([], true).querySelector('ul')).toBeNull();
  });
});
