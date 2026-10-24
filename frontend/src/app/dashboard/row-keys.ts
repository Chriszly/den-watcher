import { formatNumber } from '@angular/common';

import { isWan, linesOf, pointsOf, sum } from '../history/history';
import { ChartUnit } from '../history/line-chart';
import { I18n } from '../i18n/i18n';
import { formatBytes } from '../metrics/bytes.pipe';
import { Point, Series, Snapshot } from '../metrics/metrics';
import { Category } from './categories';

/** One of the few values a row of the rows view shows while it is closed, with its history. */
export interface RowKey {
  label: string;
  value: string;
  unit: string;
  /** The value over the range the charts show; empty while it loads or where it is not kept. */
  points: Point[];
  chartUnit: ChartUnit;
  max?: number;
  /** The color of its chart. */
  series: number;
}

/** At most this many values show in a closed row, so every row has the same shape. */
export const ROW_KEYS = 4;

/**
 * The main values of each category of a device, for the rows view: the busiest and fullest first,
 * at most four each. A router adds up only its internet connection (WAN), as the glance row does.
 * A category without values of its own, such as the programs, has none, and its row tells what
 * it holds instead.
 */
export function rowKeys(
  s: Snapshot,
  series: Series[],
  router: boolean,
  i18n: I18n,
): Partial<Record<Category, RowKey[]>> {
  const t = i18n.t.bind(i18n);
  const language = i18n.language();
  const number = (value: number) => formatNumber(value, language, '1.0-1');
  const percent = (label: string, value: number, metric: string, color: number): RowKey => ({
    label,
    value: number(value),
    unit: '%',
    points: pointsOf(series, metric),
    chartUnit: 'percent',
    max: 100,
    series: color,
  });
  const rate = (label: string, bytes: number, points: Point[], color: number): RowKey => {
    const text = formatBytes(bytes, language);
    const space = text.lastIndexOf(' ');
    return {
      label,
      value: text.slice(0, space),
      unit: `${text.slice(space + 1)}/s`,
      points,
      chartUnit: 'bytesPerSecond',
      series: color,
    };
  };

  const system: RowKey[] = [];
  if (s.cpu.cores > 0) {
    system.push(percent(t('dashboard.cpu'), s.cpu.usagePercent, 'cpu', 0));
  }
  if (s.memory.totalBytes > 0) {
    system.push(percent(t('dashboard.memory'), s.memory.usedPercent, 'memory', 1));
  }
  if (s.memory.swap) {
    system.push(percent(t('dashboard.swap'), s.memory.swap.usedPercent, 'swap', 2));
  }
  for (const gpu of s.gpus ?? []) {
    system.push(percent(gpu.name, gpu.usagePercent, `gpu:${gpu.name}`, 3));
  }

  const fullest = [...s.disks].sort((a, b) => b.usedPercent - a.usedPercent);
  const storage = fullest
    .slice(0, 2)
    .map((d, i) => percent(d.path, d.usedPercent, `disk:${d.path}`, i));
  const counters = s.disks.filter(
    (d) => d.readBytesPerSecond !== undefined || d.writeBytesPerSecond !== undefined,
  );
  if (counters.length > 0) {
    const total = (key: 'readBytesPerSecond' | 'writeBytesPerSecond') =>
      counters.reduce((all, d) => all + (d[key] ?? 0), 0);
    storage.push(
      rate(t('rows.read'), total('readBytesPerSecond'), sum(linesOf(series, 'disk.read')), 2),
      rate(t('rows.written'), total('writeBytesPerSecond'), sum(linesOf(series, 'disk.write')), 3),
    );
  }

  const counted = (name: string) => !router || isWan(name);
  const interfaces = s.network.filter((n) => counted(n.name));
  const traffic = (kind: string) => sum(linesOf(series, kind).filter((l) => counted(l.label)));
  const network =
    interfaces.length > 0
      ? [
          rate(
            t('history.received'),
            interfaces.reduce((all, n) => all + n.receiveBytesPerSecond, 0),
            traffic('network.receive'),
            0,
          ),
          rate(
            t('history.sent'),
            interfaces.reduce((all, n) => all + n.sendBytesPerSecond, 0),
            traffic('network.send'),
            1,
          ),
        ]
      : [];

  const temperature: RowKey[] = [...s.temperatures]
    .sort((a, b) => b.celsius - a.celsius)
    .slice(0, 3)
    .map((sensor, i) => ({
      label: sensor.sensor,
      value: number(sensor.celsius),
      unit: '°C',
      points: pointsOf(series, `temperature:${sensor.sensor}`),
      chartUnit: 'celsius',
      series: i,
    }));
  if (s.battery) {
    temperature.push(percent(t('dashboard.battery'), s.battery.percent, 'battery', 3));
  }

  return {
    system: system.slice(0, ROW_KEYS),
    storage: storage.slice(0, ROW_KEYS),
    network,
    temperature: temperature.slice(0, ROW_KEYS),
  };
}
