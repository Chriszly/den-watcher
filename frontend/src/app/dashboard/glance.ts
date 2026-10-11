import { formatNumber } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AlertKind, AlertLevel } from '../alerts/alert';
import { worstLevel } from '../alerts/alerts';
import { DeviceService } from '../devices/devices';
import { HistoryStore } from '../history/history-store';
import { isWan, linesOf, pointsOf, sum } from '../history/history';
import { ChartUnit } from '../history/line-chart';
import { Sparkline } from '../history/sparkline';
import { I18n } from '../i18n/i18n';
import { BytesPipe } from '../metrics/bytes.pipe';
import { Point, Snapshot } from '../metrics/metrics';
import { GlanceTile } from './glance-tile';

/** One tile of the glance row: a main value now and its history. */
export interface Tile {
  id: 'cpu' | 'memory' | 'disk' | 'temperature' | 'network';
  label: string;
  value: string;
  unit: string;
  detail: string;
  sub: string;
  alert: AlertLevel | null;
  /** The value over the range the charts show; empty while it loads. */
  points: Point[];
  chartUnit: ChartUnit;
  max?: number;
  /** The color of its chart. */
  series: number;
}

/**
 * The main values of the device in a row of large tiles above its cards: CPU, memory, the fullest
 * disk, the hottest sensor and the network, each with a small chart of the range the charts show.
 * A device that does not report a value, such as a router read without a login, has no tile for it.
 * A router passes each byte it forwards through two interfaces, so its network tile adds up only
 * its internet connection (WAN), and it has none where it does not tell which interface that is.
 */
@Component({
  selector: 'app-glance',
  imports: [GlanceTile, Sparkline],
  template: `
    @let h = store.history();
    @for (tile of tiles(); track tile.id) {
      <app-glance-tile
        [label]="tile.label"
        [value]="tile.value"
        [unit]="tile.unit"
        [detail]="tile.detail"
        [sub]="tile.sub"
        [alert]="tile.alert"
      >
        @if (h) {
          <app-sparkline
            [points]="tile.points"
            [from]="h.from"
            [to]="h.to"
            [step]="h.stepSeconds"
            [unit]="tile.chartUnit"
            [max]="tile.max"
            [series]="tile.series"
          />
        }
      </app-glance-tile>
    }
  `,
  styles: `
    :host([hidden]) {
      display: none;
    }

    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
  `,
  host: { '[hidden]': 'tiles().length === 0' },
})
export class Glance {
  readonly snapshot = input.required<Snapshot>();

  protected readonly store = inject(HistoryStore);
  private readonly devices = inject(DeviceService);
  private readonly i18n = inject(I18n);
  private readonly bytes = new BytesPipe();

  protected readonly tiles = computed((): Tile[] => {
    const s = this.snapshot();
    const series = this.store.history()?.series ?? [];
    const device = this.devices.selected();
    const router = !!device.router || !!device.checked;
    const t = this.i18n.t.bind(this.i18n);
    const language = this.i18n.language();
    const number = (value: number, digits = '1.0-1') => formatNumber(value, language, digits);
    const bytes = (value: number) => this.bytes.transform(value, language);
    const tiles: Tile[] = [];

    if (s.cpu.cores > 0) {
      const clock = s.cpu.clockMHz ? ` · ${number(s.cpu.clockMHz / 1000, '1.1-1')} GHz` : '';
      const load = s.cpu.loadAverage;
      tiles.push({
        id: 'cpu',
        label: t('dashboard.cpu'),
        value: number(s.cpu.usagePercent),
        unit: '%',
        detail:
          this.i18n.plural(s.cpu.cores, 'dashboard.cores.one', 'dashboard.cores.other') + clock,
        sub: load
          ? t('dashboard.loadAverage', {
              one: number(load.one, '1.2-2'),
              five: number(load.five, '1.2-2'),
              fifteen: number(load.fifteen, '1.2-2'),
            })
          : '',
        alert: this.alertOn('cpu'),
        points: pointsOf(series, 'cpu'),
        chartUnit: 'percent',
        max: 100,
        series: 0,
      });
    }
    if (s.memory.totalBytes > 0) {
      tiles.push({
        id: 'memory',
        label: t('dashboard.memory'),
        value: number(s.memory.usedPercent),
        unit: '%',
        detail: s.memory.swap
          ? `${t('dashboard.swap')} ${number(s.memory.swap.usedPercent)} %`
          : '',
        sub: t('dashboard.usedOfTotal', {
          used: bytes(s.memory.usedBytes),
          total: bytes(s.memory.totalBytes),
        }),
        alert: this.alertOn('memory'),
        points: pointsOf(series, 'memory'),
        chartUnit: 'percent',
        max: 100,
        series: 1,
      });
    }
    const disk = [...s.disks].sort((a, b) => b.usedPercent - a.usedPercent)[0];
    if (disk) {
      tiles.push({
        id: 'disk',
        label: t('compare.disk'),
        value: number(disk.usedPercent),
        unit: '%',
        detail: disk.path,
        sub: t('dashboard.usedOfTotal', {
          used: bytes(disk.usedBytes),
          total: bytes(disk.totalBytes),
        }),
        alert: this.alertOn('disk', disk.path),
        points: pointsOf(series, `disk:${disk.path}`),
        chartUnit: 'percent',
        max: 100,
        series: 2,
      });
    }
    const hottest = [...s.temperatures].sort((a, b) => b.celsius - a.celsius)[0];
    if (hottest) {
      const fan = s.fans?.[0];
      tiles.push({
        id: 'temperature',
        label: t('dashboard.temperature'),
        value: number(hottest.celsius),
        unit: '°C',
        detail: hottest.sensor,
        sub: fan ? `${fan.name} · ${t('dashboard.rpm', { rpm: number(fan.rpm, '1.0-0') })}` : '',
        alert: this.alertOn('temperature', hottest.sensor),
        points: pointsOf(series, `temperature:${hottest.sensor}`),
        chartUnit: 'celsius',
        series: 3,
      });
    }
    const counted = (name: string) => !router || isWan(name);
    const network = s.network.filter((n) => counted(n.name));
    if (network.length > 0) {
      const [received, unit] = splitUnit(
        bytes(network.reduce((total, n) => total + n.receiveBytesPerSecond, 0)),
      );
      const sent = bytes(network.reduce((total, n) => total + n.sendBytesPerSecond, 0));
      tiles.push({
        id: 'network',
        label: t('dashboard.network'),
        value: `↓ ${received}`,
        unit: `${unit}/s`,
        detail: network.length === 1 ? network[0].name : '',
        sub: `↑ ${sent}/s`,
        alert: null,
        points: sum(linesOf(series, 'network.receive').filter((line) => counted(line.label))),
        chartUnit: 'bytesPerSecond',
        series: 6,
      });
    }
    return tiles;
  });

  constructor() {
    this.store.watch.pipe(takeUntilDestroyed()).subscribe();
  }

  /** The worst alert of a kind, and for a tile that shows one disk or sensor only its own. */
  private alertOn(kind: AlertKind, subject?: string): AlertLevel | null {
    const alerts = this.devices.selected().alerts ?? [];
    return worstLevel(
      alerts.filter((a) => a.kind === kind && (subject === undefined || a.subject === subject)),
    );
  }
}

/** A formatted amount split into its number and its unit, such as "1.5 KiB" into "1.5" and "KiB". */
function splitUnit(text: string): [string, string] {
  const space = text.lastIndexOf(' ');
  return [text.slice(0, space), text.slice(space + 1)];
}
