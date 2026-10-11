import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { TIMELINE_STORAGE_KEY, TimelineMode } from './history/timeline';

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
});
