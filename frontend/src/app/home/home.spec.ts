import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Device, DeviceService, LOCAL_DEVICE } from '../devices/devices';
import { I18n } from '../i18n/i18n';
import { Home, problemsOf } from './home';

const DEVICES: Device[] = [
  LOCAL_DEVICE,
  {
    id: 'nas',
    name: 'NAS',
    address: '192.168.1.20:9393',
    kind: 'server',
    alerts: [
      {
        id: 1,
        device: 'nas',
        deviceName: 'NAS',
        kind: 'disk',
        subject: '/srv',
        level: 'alert',
        value: 96,
        started: '2026-10-24T06:00:00Z',
      },
    ],
  },
  { id: 'pi', name: 'Garage Pi', address: '192.168.1.30:9393', kind: 'server', unreachable: true },
  { id: 'laptop', name: 'Laptop', address: '192.168.1.40:9393', kind: 'pc', unreachable: true },
  { id: 'cam', name: 'Camera', address: '192.168.1.50:80', kind: 'server', checked: true },
];

describe('problemsOf', () => {
  it('lists alerts and servers that do not answer, but not a switched-off PC', () => {
    const problems = problemsOf(DEVICES, TestBed.inject(I18n));
    expect(problems.map((p) => [p.device.id, p.level, p.text])).toEqual([
      ['nas', 'alert', 'Disk /srv is 96 % full'],
      ['pi', 'alert', 'Not reachable'],
    ]);
  });

  it('lists a device that waits for its pairing code as a warning, after the alerts', () => {
    const problems = problemsOf(
      [{ ...DEVICES[2], unreachable: false, pairing: 'needed' }, DEVICES[1]],
      TestBed.inject(I18n),
    );
    expect(problems.map((p) => [p.device.id, p.level])).toEqual([
      ['nas', 'alert'],
      ['pi', 'warning'],
    ]);
  });
});

describe('Home', () => {
  it('tells how the devices are and shows a device when its tile is clicked', () => {
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const devices = TestBed.inject(DeviceService);
    devices.devices.set(DEVICES);
    devices.goHome();
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.headline')!.textContent!.trim()).toBe('2 devices need a look');
    expect(element.querySelector('.status')!.classList).toContain('alert');
    expect(element.querySelector('.status p:last-child')!.textContent).toContain('2 are fine');
    expect(element.querySelector('.status p:last-child')!.textContent).toContain('1 not in use');
    expect(element.querySelectorAll('.problems li').length).toBe(2);
    expect([...element.querySelectorAll('section h3')].map((h) => h.textContent)).toEqual([
      'Servers and IoT',
      'PCs and laptops',
    ]);
    expect(element.textContent).toContain('Answers; only checked whether it does');

    const nas = [...element.querySelectorAll<HTMLButtonElement>('.tiles button')].find((b) =>
      b.textContent!.includes('NAS'),
    )!;
    expect(nas.classList).toContain('alert');
    nas.click();
    expect(devices.home()).toBe(false);
    expect(devices.selectedId()).toBe('nas');

    TestBed.inject(HttpTestingController).match(() => true);
  });
});
