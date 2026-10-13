import { TestBed } from '@angular/core/testing';

import { THEME_COLORS, ThemeService } from './theme';

/** A stand-in for the browser's prefers-color-scheme query that the test can flip. */
function fakeSystemScheme(dark: boolean) {
  const listeners: ((event: MediaQueryListEvent) => void)[] = [];
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.push(listener),
    removeEventListener: () => undefined,
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    change(toDark: boolean): void {
      query.matches = toDark;
      listeners.forEach((listener) => listener({ matches: toDark } as MediaQueryListEvent));
    },
  };
}

describe('ThemeService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.colorScheme = '';
  });

  it('starts with the color scheme of the system', () => {
    fakeSystemScheme(true);

    expect(TestBed.inject(ThemeService).scheme()).toBe('dark');
  });

  it('follows the system while the user has not picked a scheme', () => {
    const system = fakeSystemScheme(false);
    const theme = TestBed.inject(ThemeService);

    system.change(true);

    expect(theme.scheme()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('');
  });

  it('switches to the other scheme and keeps it when the system changes', () => {
    const system = fakeSystemScheme(false);
    const theme = TestBed.inject(ThemeService);

    theme.toggle();
    system.change(false);

    expect(theme.scheme()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    theme.toggle();

    expect(theme.scheme()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it("colors the phone's bars in the scheme picked on the page", () => {
    fakeSystemScheme(false);
    const metas = (['light', 'dark'] as const).map((scheme) => {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.media = `(prefers-color-scheme: ${scheme})`;
      meta.content = THEME_COLORS[scheme];
      document.head.appendChild(meta);
      return meta;
    });
    try {
      TestBed.inject(ThemeService).toggle();

      expect(metas.map((m) => m.content)).toEqual([THEME_COLORS.dark, THEME_COLORS.dark]);
    } finally {
      metas.forEach((m) => m.remove());
    }
  });
});
