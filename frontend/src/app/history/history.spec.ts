import { TextParams, translate } from '../i18n/i18n';
import { MessageKey } from '../i18n/messages/en';
import { chartsOf, extraChartsOf } from './history';

describe('chartsOf', () => {
  it('groups metrics into charts and adds up the network cards', () => {
    const charts = chartsOf(
      [
        { metric: 'cpu', points: [{ time: 0, value: 10 }] },
        { metric: 'disk:/', points: [{ time: 0, value: 30 }] },
        { metric: 'network.receive:eth0', points: [{ time: 0, value: 100 }] },
        { metric: 'network.receive:wlan0', points: [{ time: 0, value: 50 }] },
        { metric: 'network.send:eth0', points: [{ time: 0, value: 7 }] },
      ],
      (key, params) => translate('en-GB', key, params),
    );

    expect(charts.map((c) => c.title)).toEqual(['CPU', 'Network', 'Disks']);
    expect(charts.map((c) => c.card)).toEqual(['cpu', 'network', 'disks']);
    expect(charts[1].lines[0].points).toEqual([{ time: 0, value: 150 }]);
    expect(charts[2].lines[0].label).toBe('/');
    expect(charts.map((c) => c.category)).toEqual(['system', 'network', 'storage']);
  });
});

describe('chartsOf for a router', () => {
  it('leaves out CPU and memory while a router tells none', () => {
    const series = [
      { metric: 'cpu', points: [{ time: 0, value: 0 }] },
      { metric: 'memory', points: [{ time: 0, value: 0 }] },
      { metric: 'network.receive:WAN', points: [{ time: 0, value: 100 }] },
    ];
    const t = (key: MessageKey, params?: TextParams) => translate('en-GB', key, params);

    expect(chartsOf(series, t, true).map((c) => c.title)).toEqual(['Network']);
    // A device at 0 % is still charted.
    expect(chartsOf(series, t).map((c) => c.title)).toEqual(['CPU', 'Memory', 'Network']);
    // A router read with a login tells them.
    series[0].points = [{ time: 0, value: 12 }];
    expect(chartsOf(series, t, true)[0].lines[0]).toEqual({
      label: 'CPU',
      points: [{ time: 0, value: 12 }],
    });
  });

  it('charts only the internet connection of a router that tells it', () => {
    const series = [
      { metric: 'network.receive:WAN', points: [{ time: 0, value: 100 }] },
      { metric: 'network.receive:LAN', points: [{ time: 0, value: 12 }] },
      { metric: 'network.receive:Wi-Fi 5 GHz', points: [{ time: 0, value: 30 }] },
      { metric: 'network.send:WAN', points: [{ time: 0, value: 40 }] },
      { metric: 'network.send:LAN', points: [{ time: 0, value: 90 }] },
    ];
    const t = (key: MessageKey, params?: TextParams) => translate('en-GB', key, params);

    expect(chartsOf(series, t, true)[0].lines).toEqual([
      { label: 'Received', points: [{ time: 0, value: 100 }] },
      { label: 'Sent', points: [{ time: 0, value: 40 }] },
    ]);
    // A device's interfaces are added up.
    expect(chartsOf(series, t)[0].lines[0].points).toEqual([{ time: 0, value: 142 }]);
  });

  it('gives each interface its own lines on a router that does not tell its internet connection', () => {
    const series = [
      { metric: 'network.receive:ether1', points: [{ time: 0, value: 100 }] },
      { metric: 'network.receive:bridge', points: [{ time: 0, value: 12 }] },
      { metric: 'network.send:ether1', points: [{ time: 0, value: 40 }] },
    ];
    const t = (key: MessageKey, params?: TextParams) => translate('en-GB', key, params);

    expect(chartsOf(series, t, true)[0].lines.map((line) => line.label)).toEqual([
      'ether1 received',
      'bridge received',
      'ether1 sent',
    ]);
  });
});

describe('chartsOf with swap and disk activity', () => {
  it('adds swap to the memory chart and charts disk speeds in the disks card', () => {
    const charts = chartsOf(
      [
        { metric: 'memory', points: [{ time: 0, value: 40 }] },
        { metric: 'disk.read:/', points: [{ time: 0, value: 2048 }] },
        { metric: 'disk.write:/', points: [{ time: 0, value: 512 }] },
        { metric: 'swap', points: [{ time: 0, value: 5 }] },
      ],
      (key, params) => translate('en-GB', key, params),
    );

    expect(charts.map((c) => c.title)).toEqual(['Memory', 'Disk activity']);
    expect(charts[0].lines.map((l) => l.label)).toEqual(['Memory', 'Swap']);
    expect(charts[1].card).toBe('disks');
    expect(charts[1].unit).toBe('bytesPerSecond');
    expect(charts[1].lines.map((l) => l.label)).toEqual(['/ read', '/ written']);
  });

  it('has no swap line for a machine without swap space', () => {
    const charts = chartsOf(
      [{ metric: 'memory', points: [{ time: 0, value: 40 }] }],
      (key, params) => translate('en-GB', key, params),
    );
    expect(charts[0].lines.map((l) => l.label)).toEqual(['Memory']);
  });
});

describe('chartsOf with a battery', () => {
  it('charts the battery charge', () => {
    const charts = chartsOf(
      [
        { metric: 'cpu', points: [{ time: 0, value: 10 }] },
        { metric: 'battery', points: [{ time: 0, value: 80 }] },
      ],
      (key, params) => translate('en-GB', key, params),
    );
    expect(charts.map((c) => c.title)).toEqual(['CPU', 'Battery']);
    expect(charts[1].lines[0].label).toBe('Charge');
  });
});

describe('chartsOf with GPUs', () => {
  it('shows the usage and memory of each GPU in one chart', () => {
    const charts = chartsOf(
      [
        { metric: 'cpu', points: [{ time: 0, value: 10 }] },
        { metric: 'gpu:AMD GPU', points: [{ time: 0, value: 70 }] },
        { metric: 'gpu.memory:AMD GPU', points: [{ time: 0, value: 25 }] },
      ],
      (key, params) => translate('en-GB', key, params),
    );

    expect(charts.map((c) => c.title)).toEqual(['CPU', 'GPU']);
    expect(charts[1].lines.map((l) => l.label)).toEqual(['AMD GPU', 'AMD GPU memory']);
  });
});

describe('extraChartsOf', () => {
  const points = [{ time: 60, value: 2 }];

  it('draws one chart per group and unit, as the device describes them', () => {
    const charts = extraChartsOf(
      [
        { metric: 'extra:pressure/cpu', points },
        { metric: 'extra:pressure/memory', points },
        { metric: 'extra:pressure/stalls', points },
        { metric: 'extra:pressure/undescribed', points },
      ],
      {
        'extra:pressure/cpu': {
          title: 'Pressure',
          titles: { de: 'Druck' },
          label: 'CPU',
          unit: 'percent',
        },
        'extra:pressure/memory': {
          title: 'Pressure',
          label: 'Memory',
          labels: { de: 'Speicher' },
          unit: 'percent',
        },
        'extra:pressure/stalls': { title: 'Pressure', label: 'Stalls', unit: 'perSecond' },
      },
      'de',
    );

    expect(charts).toEqual([
      {
        title: 'Druck',
        category: 'system',
        card: 'extra:pressure',
        unit: 'percent',
        max: 100,
        lines: [
          { label: 'CPU', points },
          { label: 'Speicher', points },
        ],
      },
      {
        title: 'Pressure · Stalls',
        category: 'system',
        card: 'extra:pressure',
        part: 'Stalls',
        unit: 'perSecond',
        max: undefined,
        lines: [{ label: 'Stalls', points }],
      },
    ]);
  });
});
