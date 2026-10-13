import { ExtraInfo } from '../metrics/extras';
import { History, Point } from '../metrics/metrics';
import { RingBuffer } from './ring-buffer';

/**
 * The longest short range: the backend reads ranges of up to 30 minutes from the readings in memory
 * in 5 second steps. Such a range is read every 5 seconds and shows the seconds of its times. It is
 * also the longest range kept up to date with only its newest steps, as a few seconds of it come in
 * the same steps as the whole range; a longer range has longer steps than a short read would get.
 */
export const SHORT_SPAN = 30 * 60;

/**
 * The history of the latest `span` seconds, kept in a ring buffer per metric, so a refresh reads
 * only the steps since the newest one and the oldest steps drop out as new ones come in.
 */
export class LiveHistory {
  private readonly buffers = new Map<string, RingBuffer<Point>>();
  private readonly extras: Record<string, ExtraInfo>;
  private retentionDays: number;
  private readonly step: number;

  /**
   * Whether a history read for `span` seconds can be kept up to date this way: not when the
   * range is long, nor when the device is not answering and the range ends at its last reading.
   */
  static canKeep(history: History, span: number): boolean {
    return span <= SHORT_SPAN && history.lastReading === undefined && history.stepSeconds > 0;
  }

  constructor(
    history: History,
    private readonly span: number,
  ) {
    this.step = history.stepSeconds;
    this.extras = { ...history.extras };
    this.retentionDays = history.retentionDays;
    for (const series of history.series) {
      const buffer = this.buffer(series.metric);
      series.points.forEach((point) => buffer.push(point));
    }
  }

  /**
   * Where the next read starts: at the newest step, which may have had only some of its readings
   * when it was read. Null when there is no step yet, so the whole range is read again.
   */
  since(): number | null {
    let newest: number | null = null;
    for (const buffer of this.buffers.values()) {
      const time = buffer.newest()?.time;
      if (time !== undefined && (newest === null || time > newest)) {
        newest = time;
      }
    }
    return newest;
  }

  /**
   * Adds the steps of `update`, a read from `since()` on, and drops those that are now older than
   * the range, which ends where the backend says the update ends. Returns the whole range, or null
   * when the update does not fit, as when its steps are of another length; then the whole range is
   * read again.
   */
  add(update: History): History | null {
    if (update.stepSeconds !== this.step || update.lastReading !== undefined) {
      return null;
    }
    // The backend's end, not this computer's clock, so the range ends where a whole read would.
    const to = update.to;
    const from = to - this.span;
    for (const series of update.series) {
      const first = series.points[0];
      if (!first) {
        continue;
      }
      const buffer = this.buffer(series.metric);
      // The steps read again replace the ones read before.
      buffer.dropNewestWhile((point) => point.time >= first.time);
      series.points.forEach((point) => buffer.push(point));
    }
    for (const [metric, buffer] of this.buffers) {
      buffer.dropOldestWhile((point) => point.time + this.step <= from);
      if (buffer.length === 0) {
        this.buffers.delete(metric);
      }
    }
    Object.assign(this.extras, update.extras);
    this.retentionDays = update.retentionDays;

    const metrics = [...this.buffers.keys()].sort();
    // As in a whole read, only the extras that have a series are described.
    for (const metric of Object.keys(this.extras)) {
      if (!this.buffers.has(metric)) {
        delete this.extras[metric];
      }
    }
    const history: History = {
      from,
      to,
      stepSeconds: this.step,
      retentionDays: this.retentionDays,
      series: metrics.map((metric) => ({ metric, points: this.buffers.get(metric)!.toArray() })),
    };
    if (Object.keys(this.extras).length > 0) {
      history.extras = { ...this.extras };
    }
    return history;
  }

  private buffer(metric: string): RingBuffer<Point> {
    let buffer = this.buffers.get(metric);
    if (!buffer) {
      // One step more than the range holds, for the step the range starts in the middle of.
      buffer = new RingBuffer<Point>(Math.ceil(this.span / this.step) + 1);
      this.buffers.set(metric, buffer);
    }
    return buffer;
  }
}
