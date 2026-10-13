import { TestBed } from '@angular/core/testing';

import {
  MissingPart,
  MissingParts,
  PAGE_RELOAD,
  RELOAD_GUARD_MS,
  RELOAD_STORAGE_KEY,
} from './missing-part';

describe('MissingParts', () => {
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    reload = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: PAGE_RELOAD, useValue: reload }] });
  });

  afterEach(() => {
    sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    vi.useRealTimers();
  });

  it('loads a part that is there without reloading', async () => {
    await expect(TestBed.inject(MissingParts).load(() => Promise.resolve('dialog'))).resolves.toBe(
      'dialog',
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads the page once for a part of an older build, not again within a minute', async () => {
    const parts = TestBed.inject(MissingParts);
    const missing = () =>
      Promise.reject(new TypeError('Failed to fetch dynamically imported module'));

    await expect(parts.load(missing)).rejects.toThrow(TypeError);
    expect(reload).toHaveBeenCalledTimes(1);

    // The page reloaded and the part is still missing: that is no update, so it is not reloaded again.
    await expect(parts.load(missing)).rejects.toThrow(TypeError);
    expect(reload).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(RELOAD_GUARD_MS);
    await expect(parts.load(missing)).rejects.toThrow(TypeError);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('reloads for a missing part in place of the part, and says so when that did not help', () => {
    const first = TestBed.createComponent(MissingPart);
    first.detectChanges();
    expect(reload).toHaveBeenCalledTimes(1);
    expect((first.nativeElement as HTMLElement).textContent!.trim()).toBe('');

    const again = TestBed.createComponent(MissingPart);
    again.detectChanges();
    expect(reload).toHaveBeenCalledTimes(1);
    expect((again.nativeElement as HTMLElement).textContent).toContain(
      'This part of the page could not be loaded',
    );
  });
});
