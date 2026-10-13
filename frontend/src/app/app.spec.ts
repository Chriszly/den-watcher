import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DeferBlockState, TestBed } from '@angular/core/testing';

import { App } from './app';
import { DeviceService, LOCAL_DEVICE } from './devices/devices';
import { TIMELINE_STORAGE_KEY, TimelineMode } from './history/timeline';
import { MissingParts, PAGE_RELOAD } from './update/missing-part';

describe('App', () => {
  it('shows the page title', () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const heading = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(heading?.textContent).toContain('Den-Watcher');
  });

  it('shows the mascot next to the page title', () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const mascot = (fixture.nativeElement as HTMLElement).querySelector('header app-mascot svg');
    expect(mascot).not.toBeNull();
  });

  it('has the light and dark switch next to the languages', () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const toggle = (fixture.nativeElement as HTMLElement).querySelector(
      'header app-theme-toggle + app-language-switcher',
    );
    expect(toggle).not.toBeNull();
  });

  it('switches to the timeline and back when the mascot is clicked', () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const mascot = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'header button.mascot',
    )!;
    expect(mascot.getAttribute('aria-label')).toBe('Show every value on one timeline');
    expect(mascot.getAttribute('aria-pressed')).toBe('false');

    mascot.click();
    fixture.detectChanges();
    expect(mascot.getAttribute('aria-pressed')).toBe('true');
    expect(TestBed.inject(TimelineMode).on()).toBe(true);

    mascot.click();
    localStorage.removeItem(TIMELINE_STORAGE_KEY);
  });

  it('stands in for the comparison when it cannot be loaded', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PAGE_RELOAD, useValue: vi.fn() },
      ],
    });
    const devices = TestBed.inject(DeviceService);
    devices.devices.set([LOCAL_DEVICE, { id: 'pi', name: 'Pi' }]);
    devices.comparing.set(true);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    for (const block of await fixture.getDeferBlocks()) {
      await block.render(DeferBlockState.Error);
    }
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-compare')).toBeNull();
    expect(element.querySelector('app-missing-part')).not.toBeNull();
  });

  it('says when a dialog could not be loaded and the page was not reloaded for it', () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.missing-part')).toBeNull();

    TestBed.inject(MissingParts).missing.set(true);
    fixture.detectChanges();
    expect(element.querySelector('.missing-part[role="alert"]')?.textContent).toContain(
      'This part of the page could not be loaded',
    );
  });
});
