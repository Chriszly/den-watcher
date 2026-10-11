import { TestBed } from '@angular/core/testing';

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  afterEach(() => {
    document.documentElement.style.colorScheme = '';
  });

  it('switches between light and dark, with a sun while dark and a moon while light', () => {
    const fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
    expect(button.querySelector('circle')).toBeNull();

    button.click();
    fixture.detectChanges();
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(button.querySelector('circle')).not.toBeNull();
  });
});
