import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import {
  ANSWER_TIMEOUT_MS,
  HubConnection,
  hubConnectionInterceptor,
} from '../connection/connection';
import {
  MissingPart,
  MissingParts,
  PAGE_RELOAD,
  RELOAD_GUARD_MS,
  RELOAD_STORAGE_KEY,
} from './missing-part';
import { KioskMode } from '../kiosk/kiosk';

describe('MissingParts', () => {
  let reload: ReturnType<typeof vi.fn>;
  let http: HttpTestingController;

  const missing = () =>
    Promise.reject(new TypeError('Failed to fetch dynamically imported module'));

  beforeEach(() => {
    vi.useFakeTimers();
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([hubConnectionInterceptor])),
        provideHttpClientTesting(),
        { provide: PAGE_RELOAD, useValue: reload },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.removeItem(RELOAD_STORAGE_KEY);
    vi.useRealTimers();
  });

  /** Lets the promises waiting on each other go on, as far as they can without an answer. */
  async function settle(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
  }

  /** Answers the question whether the hub serves the page, which comes before a reload. */
  function hubAnswers(): void {
    http.expectOne({ method: 'HEAD', url: '/' }).flush('');
  }

  it('loads a part that is there without reloading', async () => {
    const parts = TestBed.inject(MissingParts);
    await expect(parts.load(() => Promise.resolve('dialog'))).resolves.toBe('dialog');
    expect(reload).not.toHaveBeenCalled();
    expect(parts.missing()).toBe(false);
  });

  it('reloads the page once for a part of an older build, not again within a minute', async () => {
    const parts = TestBed.inject(MissingParts);

    const first = parts.load(missing);
    await settle();
    hubAnswers();
    await expect(first).rejects.toThrow(TypeError);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(parts.missing()).toBe(false);

    // The page reloaded and the part is still missing: that is no update, so it is not reloaded again.
    await expect(parts.load(missing)).rejects.toThrow(TypeError);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(parts.missing()).toBe(true);

    vi.advanceTimersByTime(RELOAD_GUARD_MS);
    const later = parts.load(missing);
    await settle();
    hubAnswers();
    await expect(later).rejects.toThrow(TypeError);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('does not reload while the hub is known not to answer', async () => {
    const parts = TestBed.inject(MissingParts);
    TestBed.inject(HubConnection).failed();

    await expect(parts.load(missing)).rejects.toThrow(TypeError);
    expect(reload).not.toHaveBeenCalled();
    expect(parts.missing()).toBe(true);
  });

  it('does not reload when the hub has just stopped answering, and says it does not', async () => {
    const parts = TestBed.inject(MissingParts);

    const loading = parts.load(missing);
    await settle();
    http.expectOne({ method: 'HEAD', url: '/' }).error(new ProgressEvent('error'));
    await expect(loading).rejects.toThrow(TypeError);
    expect(reload).not.toHaveBeenCalled();
    expect(parts.missing()).toBe(true);
    expect(TestBed.inject(HubConnection).lost()).toBe(true);

    // Once the hub answers again, the page can be reloaded for the part.
    TestBed.inject(HubConnection).answered();
    const again = parts.load(missing);
    await settle();
    hubAnswers();
    await expect(again).rejects.toThrow(TypeError);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload when the hub does not answer in time', async () => {
    const parts = TestBed.inject(MissingParts);

    const loading = expect(parts.load(missing)).rejects.toThrow(TypeError);
    await settle();
    const probe = http.expectOne({ method: 'HEAD', url: '/' });
    await vi.advanceTimersByTimeAsync(ANSWER_TIMEOUT_MS);
    await loading;
    expect(probe.cancelled).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    expect(parts.missing()).toBe(true);
    expect(TestBed.inject(HubConnection).lost()).toBe(true);
  });

  it('reloads when the hub answers with an error, as the demo does, as a reload shows a page', async () => {
    const parts = TestBed.inject(MissingParts);

    const loading = parts.load(missing);
    await settle();
    http
      .expectOne({ method: 'HEAD', url: '/' })
      .flush('', { status: 404, statusText: 'Not Found' });
    await expect(loading).rejects.toThrow(TypeError);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('stops saying a part is missing once one loads', async () => {
    const parts = TestBed.inject(MissingParts);
    TestBed.inject(HubConnection).failed();
    await expect(parts.load(missing)).rejects.toThrow(TypeError);
    expect(parts.missing()).toBe(true);

    await parts.load(() => Promise.resolve('dialog'));
    expect(parts.missing()).toBe(false);
  });

  it('reloads for a missing part in place of the part, and says so when that did not help', async () => {
    const first = TestBed.createComponent(MissingPart);
    first.detectChanges();
    await settle();
    hubAnswers();
    await settle();
    first.detectChanges();
    expect(reload).toHaveBeenCalledTimes(1);
    expect((first.nativeElement as HTMLElement).textContent!.trim()).toBe('');

    const again = TestBed.createComponent(MissingPart);
    await settle();
    again.detectChanges();
    expect(reload).toHaveBeenCalledTimes(1);
    expect((again.nativeElement as HTMLElement).textContent).toContain(
      'This part of the page could not be loaded',
    );
  });

  it('reloads for a missing part in place of it once the hub answers again, on a wall display', async () => {
    (TestBed.inject(KioskMode) as { on: boolean }).on = true;
    const connection = TestBed.inject(HubConnection);
    const part = TestBed.createComponent(MissingPart);
    const text = () => (part.nativeElement as HTMLElement).textContent!;
    part.detectChanges();
    await settle();
    http.expectOne({ method: 'HEAD', url: '/' }).error(new ProgressEvent('error'));
    await settle();
    part.detectChanges();
    expect(reload).not.toHaveBeenCalled();
    expect(text()).toContain('This part of the page could not be loaded');

    // An answer to the page's polls, but the hub is gone again when asked: it waits once more.
    connection.answered();
    part.detectChanges();
    await settle();
    http.expectOne({ method: 'HEAD', url: '/' }).error(new ProgressEvent('error'));
    await settle();
    part.detectChanges();
    expect(reload).not.toHaveBeenCalled();
    expect(connection.lost()).toBe(true);

    connection.answered();
    part.detectChanges();
    await settle();
    hubAnswers();
    await settle();
    part.detectChanges();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(text().trim()).toBe('');
  });

  it('does not reload for a missing part when the hub answers again, but not on a wall display', async () => {
    const connection = TestBed.inject(HubConnection);
    const part = TestBed.createComponent(MissingPart);
    part.detectChanges();
    await settle();
    http.expectOne({ method: 'HEAD', url: '/' }).error(new ProgressEvent('error'));
    await settle();

    // Someone may be typing in a dialog meanwhile, which a reload would drop.
    connection.answered();
    part.detectChanges();
    await settle();
    part.detectChanges();
    http.expectNone({ method: 'HEAD', url: '/' });
    expect(reload).not.toHaveBeenCalled();
    expect((part.nativeElement as HTMLElement).textContent).toContain(
      'This part of the page could not be loaded',
    );
  });

  it('does not reload for a missing part when the hub answers again within a minute of a reload', async () => {
    sessionStorage.setItem(RELOAD_STORAGE_KEY, String(Date.now()));
    const connection = TestBed.inject(HubConnection);
    connection.failed();
    const part = TestBed.createComponent(MissingPart);
    part.detectChanges();
    await settle();

    connection.answered();
    part.detectChanges();
    await settle();
    part.detectChanges();
    expect(reload).not.toHaveBeenCalled();
    expect((part.nativeElement as HTMLElement).textContent).toContain(
      'This part of the page could not be loaded',
    );
  });

  it('says a part is missing in place of it while the hub does not answer', async () => {
    TestBed.inject(HubConnection).failed();
    const part = TestBed.createComponent(MissingPart);
    await settle();
    part.detectChanges();
    expect(reload).not.toHaveBeenCalled();
    expect((part.nativeElement as HTMLElement).textContent).toContain(
      'This part of the page could not be loaded',
    );
  });
});
