import { TestBed } from '@angular/core/testing';

import { I18n } from '../i18n/i18n';
import { Snapshot } from '../metrics/metrics';
import { rowKeys } from './row-keys';

const snapshot: Snapshot = {
  time: '2026-10-02T17:00:00Z',
  uptimeSeconds: 3600,
  cpu: { usagePercent: 12.5, cores: 4 },
  memory: {
    totalBytes: 8 * 1024 ** 3,
    usedBytes: 2 * 1024 ** 3,
    usedPercent: 25,
    swap: { totalBytes: 1024 ** 3, usedBytes: 0, usedPercent: 0 },
  },
  gpus: [{ name: 'VideoCore VII', usagePercent: 5 }],
  temperatures: [
    { sensor: 'cpu_thermal', celsius: 48.3 },
    { sensor: 'nvme', celsius: 51 },
  ],
  disks: [
    { path: '/', totalBytes: 100, usedBytes: 20, usedPercent: 20, readBytesPerSecond: 1024 },
    {
      path: '/mnt/usb',
      totalBytes: 100,
      usedBytes: 79,
      usedPercent: 79,
      writeBytesPerSecond: 2048,
    },
    { path: '/boot', totalBytes: 100, usedBytes: 10, usedPercent: 10 },
  ],
  network: [
    {
      name: 'WAN',
      receivedBytes: 0,
      sentBytes: 0,
      receiveBytesPerSecond: 1024,
      sendBytesPerSecond: 0,
    },
    {
      name: 'LAN',
      receivedBytes: 0,
      sentBytes: 0,
      receiveBytesPerSecond: 4096,
      sendBytesPerSecond: 0,
    },
  ],
};

describe('rowKeys', () => {
  const keys = (router = false) => rowKeys(snapshot, [], router, TestBed.inject(I18n));
  const labels = (router = false) =>
    Object.fromEntries(
      Object.entries(keys(router)).map(([c, k]) => [c, k.map((key) => key.label)]),
    );

  it('picks the main values of each category, the fullest and hottest first', () => {
    expect(labels()).toEqual({
      system: ['CPU', 'Memory', 'Swap', 'VideoCore VII'],
      storage: ['/mnt/usb', '/', 'Read', 'Written'],
      network: ['Received', 'Sent'],
      temperature: ['nvme', 'cpu_thermal'],
    });
  });

  it('adds up the traffic of the disks and network cards', () => {
    const k = keys();
    expect(k.storage!.slice(2).map((key) => `${key.value} ${key.unit}`)).toEqual([
      '1.0 KiB/s',
      '2.0 KiB/s',
    ]);
    expect(k.network![0].value + ' ' + k.network![0].unit).toBe('5.0 KiB/s');
  });

  it("counts only a router's internet connection", () => {
    expect(keys(true).network![0].value).toBe('1.0');
  });
});
