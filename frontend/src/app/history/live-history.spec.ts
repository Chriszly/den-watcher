import { ExtraInfo } from '../metrics/extras';
import { History } from '../metrics/metrics';
import { SHORT_SPAN, LiveHistory } from './live-history';

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
    expect(LiveHistory.canKeep(MINUTE, SHORT_SPAN + 1)).toBe(false);
    expect(LiveHistory.canKeep({ ...MINUTE, lastReading: 1055 }, 60)).toBe(false);
  });

  it('reads on from the newest step', () => {
    expect(new LiveHistory(MINUTE, 60).since()).toBe(1055);
    expect(new LiveHistory({ ...MINUTE, series: [] }, 60).since()).toBeNull();
  });

  it('adds the new steps, replaces the newest one read again and drops the old ones', () => {
    const live = new LiveHistory(MINUTE, 60);
    const history = live.add({
      ...MINUTE,
      from: 1055,
      // Where the backend says the range ends, whatever the clock of the page says.
      to: 1066,
      series: [
        { metric: 'cpu', points: [{ time: 1055, value: 99 }, ...points(1060, 1065)] },
        { metric: 'extra:fan/speed', points: points(1065) },
      ],
      extras: { 'extra:fan/speed': FAN },
    });

    expect(history).toEqual({
      from: 1006,
      to: 1066,
      stepSeconds: 5,
      retentionDays: 30,
      // The steps that started at 1000 are over before 1006, the one at 1005 is not.
      series: [
        {
          metric: 'cpu',
          points: [...points(1005, 1050), { time: 1055, value: 99 }, ...points(1060, 1065)],
        },
        { metric: 'extra:fan/speed', points: points(1065) },
      ],
      extras: { 'extra:fan/speed': FAN },
    });
    expect(live.since()).toBe(1065);
  });

  it('forgets an extra once its steps are older than the range', () => {
    const live = new LiveHistory(
      {
        ...MINUTE,
        series: [...MINUTE.series, { metric: 'extra:fan/speed', points: points(1000) }],
        extras: { 'extra:fan/speed': FAN },
      },
      60,
    );
    const history = live.add({ ...MINUTE, from: 1055, to: 1070, series: [] });
    expect(history?.series.map((s) => s.metric)).toEqual(['cpu']);
    expect(history?.extras).toBeUndefined();
  });

  it('keeps only the steps of the range, however many come in', () => {
    const live = new LiveHistory({ ...MINUTE, series: [] }, 20);
    const history = live.add({
      ...MINUTE,
      to: 1035,
      series: [{ metric: 'cpu', points: points(1000, 1005, 1010, 1015, 1020, 1025, 1030) }],
    });
    expect(history?.series[0].points.map((p) => p.time)).toEqual([1015, 1020, 1025, 1030]);
  });

  it('does not take steps of another length, nor a range moved back to a last reading', () => {
    const live = new LiveHistory(MINUTE, 60);
    expect(live.add({ ...MINUTE, stepSeconds: 60 })).toBeNull();
    expect(live.add({ ...MINUTE, lastReading: 1055 })).toBeNull();
  });
});
