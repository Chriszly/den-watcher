import { RingBuffer } from './ring-buffer';

describe('RingBuffer', () => {
  it('keeps the newest items once it is full, from the oldest to the newest', () => {
    const buffer = new RingBuffer<number>(3);
    expect(buffer.toArray()).toEqual([]);
    expect(buffer.newest()).toBeUndefined();

    [1, 2, 3, 4, 5].forEach((n) => buffer.push(n));
    expect(buffer.length).toBe(3);
    expect(buffer.toArray()).toEqual([3, 4, 5]);
    expect(buffer.at(0)).toBe(3);
    expect(buffer.newest()).toBe(5);
    expect(buffer.at(3)).toBeUndefined();
  });

  it('drops items at either end, also where they wrap around', () => {
    const buffer = new RingBuffer<number>(4);
    [1, 2, 3, 4, 5, 6].forEach((n) => buffer.push(n));

    buffer.dropOldestWhile((n) => n < 4);
    expect(buffer.toArray()).toEqual([4, 5, 6]);
    buffer.dropNewestWhile((n) => n > 5);
    expect(buffer.toArray()).toEqual([4, 5]);

    [7, 8, 9].forEach((n) => buffer.push(n));
    expect(buffer.toArray()).toEqual([5, 7, 8, 9]);
    buffer.dropOldestWhile(() => true);
    expect(buffer.length).toBe(0);
    buffer.push(10);
    expect(buffer.toArray()).toEqual([10]);
  });

  it('needs room for at least one item', () => {
    expect(() => new RingBuffer(0)).toThrowError(RangeError);
    expect(() => new RingBuffer(1.5)).toThrowError(RangeError);
  });
});
