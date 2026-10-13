/**
 * A list of at most `capacity` items in a fixed block of memory: adding to a full buffer drops the
 * oldest item, and nothing moves when items are added or dropped at either end.
 */
export class RingBuffer<T> {
  private readonly items: (T | undefined)[];
  /** Where the oldest item is. */
  private start = 0;
  private count = 0;

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`A ring buffer needs a capacity of at least 1, not ${capacity}`);
    }
    this.items = new Array<T | undefined>(capacity);
  }

  get length(): number {
    return this.count;
  }

  /** The item at `index`, 0 being the oldest; undefined outside the buffer. */
  at(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    return this.items[(this.start + index) % this.capacity];
  }

  /** The newest item, or undefined when the buffer is empty. */
  newest(): T | undefined {
    return this.at(this.count - 1);
  }

  /** Adds an item after the newest, dropping the oldest when the buffer is full. */
  push(item: T): void {
    if (this.count === this.capacity) {
      this.items[this.start] = item;
      this.start = (this.start + 1) % this.capacity;
      return;
    }
    this.items[(this.start + this.count) % this.capacity] = item;
    this.count++;
  }

  /** Drops the oldest items for as long as `drop` says so. */
  dropOldestWhile(drop: (item: T) => boolean): void {
    while (this.count > 0 && drop(this.items[this.start] as T)) {
      this.items[this.start] = undefined;
      this.start = (this.start + 1) % this.capacity;
      this.count--;
    }
  }

  /** Drops the newest items for as long as `drop` says so. */
  dropNewestWhile(drop: (item: T) => boolean): void {
    while (this.count > 0) {
      const last = (this.start + this.count - 1) % this.capacity;
      if (!drop(this.items[last] as T)) {
        return;
      }
      this.items[last] = undefined;
      this.count--;
    }
  }

  /** The items from the oldest to the newest, as a new array. */
  toArray(): T[] {
    return Array.from({ length: this.count }, (_, i) => this.at(i) as T);
  }
}
