import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { mediaMatches, observeWidth, readStored, saveFile, store } from './browser';

describe('readStored and store', () => {
  afterEach(() => {
    localStorage.removeItem('test');
    vi.restoreAllMocks();
  });

  it('keep a value for the next visit', () => {
    store(window, 'test', 'kept');

    expect(readStored(window, 'test')).toBe('kept');
  });

  it('read nothing that was not kept', () => {
    expect(readStored(window, 'test')).toBeNull();
  });

  it('read nothing and keep nothing where storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => store(window, 'test', 'kept')).not.toThrow();
    expect(readStored(window, 'test')).toBeNull();
  });

  it('read nothing without a window', () => {
    expect(readStored(null, 'test')).toBeNull();
    expect(() => store(null, 'test', 'kept')).not.toThrow();
  });
});

describe('saveFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('downloads the file under its name and lets its URL go a minute later', () => {
    vi.useFakeTimers();
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const file = new Blob(['time,cpu\r\n']);

    saveFile(document, file, 'nas.csv');

    expect(create).toHaveBeenCalledWith(file);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('nas.csv');
    expect(link.href).toBe('blob:file');
    vi.advanceTimersByTime(59_999);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledWith('blob:file');
  });
});

describe('mediaMatches', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('follows the query until it is destroyed', () => {
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_: string, l: (event: MediaQueryListEvent) => void) => (listener = l),
      removeEventListener: () => (listener = undefined),
    }));
    const injector = Injector.create({ providers: [], parent: TestBed.inject(Injector) });
    const matches = runInInjectionContext(injector, () => mediaMatches('(width >= 48rem)', true));

    expect(matches()).toBe(false);
    listener!({ matches: true } as MediaQueryListEvent);
    expect(matches()).toBe(true);

    injector.destroy();
    expect(listener).toBeUndefined();
  });

  it('takes the fallback where the browser cannot tell', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(TestBed.runInInjectionContext(() => mediaMatches('(width >= 48rem)', true))()).toBe(
      true,
    );
  });
});

describe('observeWidth', () => {
  let report: (width: number, height?: number) => void;
  let disconnected = false;

  beforeEach(() => {
    disconnected = false;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(
          callback: (entries: { contentRect: { width: number; height: number } }[]) => void,
        ) {
          report = (width, height = 0) => callback([{ contentRect: { width, height } }]);
        }
        observe = () => undefined;
        disconnect = () => (disconnected = true);
      },
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('tells only a width that changed, once the element has one', () => {
    const widths: number[] = [];
    const injector = Injector.create({ providers: [], parent: TestBed.inject(Injector) });
    runInInjectionContext(injector, () =>
      observeWidth(document.body, (width) => widths.push(width)),
    );

    report(0);
    report(300);
    report(300, 50);
    report(200);
    expect(widths).toEqual([300, 200]);

    injector.destroy();
    expect(disconnected).toBe(true);
  });
});
