import { ExtraInfo } from '../metrics/extras';
import { History } from '../metrics/metrics';
import { LIVE_SPAN, LiveHistory } from './live-history';

const FAN: ExtraInfo = { title: 'Fans', label: 'Fan', unit: 'number' };

const points = (...times: number[]) => times.map((time) => ({ time, value: time / 5 }));

/** The last minute up to 1060, in 5 second steps. */
const MINUTE: History = {
  from: 1000,
  to: 1060,
  stepSeconds: 5,
  retentionDays: 30,
  series: [
    { metric: 'cpu', points: points(1000, 1005, 1050, 1055) },
    { metric: 'memory', points: points(1000) },
  ],
};

describe('LiveHistory', () => {
  it('keeps short ranges of an answering device', () => {
    expect(LiveHistory.canKeep(MINUTE, 60)).toBe(true);
    expect(LiveHistory.canKeep(MINUTE, LIVE_SPAN + 1)).toBe(false);
    expect(LiveHistory.canKeep({ ...MINUTE, lastReading: 1055 }, 60)).toBe(false);
  });

  it('reads on from the newest step', () => {
    expect(new LiveHistory(MINUTE, 60).since()).toBe(1055);
    expect(new LiveHistory({ ...MINUTE, series: [] }, 60).since()).toBeNull();
  });

  it('adds the new steps, replaces the newest one read again and drops the old ones', () => {
    const live = new LiveHistory(MINUTE, 60);
    const history = live.add(
      {
        ...MINUTE,
        from: 1055,
        to: 1066,
        series: [{ metric: 'cpu', points: [{ time: 1055, value: 99 }, ...points(1060, 1065)] }],
        extras: { 'extra:fan/speed': FAN },
      },
      1006,
      1066,
    );

    expect(history).toEqual({
      from: 1006,
      to: 1066,
      stepSeconds: 5,
      retentionDays: 30,
      // The step that started at 1000 is over before 1006; the one at 1005 is not.
      series: [
        {
          metric: 'cpu',
          points: [...points(1005, 1050), { time: 1055, value: 99 }, ...points(1060, 1065)],
        },
      ],
      extras: { 'extra:fan/speed': FAN },
    });
    expect(live.since()).toBe(1065);
  });

  it('holds no more steps than the range has', () => {
    const live = new LiveHistory({ ...MINUTE, series: [] }, 20);
    const history = live.add(
      {
        ...MINUTE,
        series: [{ metric: 'cpu', points: points(1000, 1005, 1010, 1015, 1020, 1025, 1030) }],
      },
      0,
      1035,
    );
    expect(history?.series[0].points.map((p) => p.time)).toEqual([1010, 1015, 1020, 1025, 1030]);
  });

  it('does not take steps of another length, nor a range moved back to a last reading', () => {
    const live = new LiveHistory(MINUTE, 60);
    expect(live.add({ ...MINUTE, stepSeconds: 60 }, 1000, 1060)).toBeNull();
    expect(live.add({ ...MINUTE, lastReading: 1055 }, 1000, 1060)).toBeNull();
  });
});
