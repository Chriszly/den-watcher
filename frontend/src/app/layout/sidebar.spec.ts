import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { COLLAPSED_STORAGE_KEY, Sidebar, SidebarState } from './sidebar';

@Component({
  imports: [Sidebar],
  template: `<app-sidebar label="Devices"
    ><button type="button" class="pick">Pi</button></app-sidebar
  >`,
})
class Host {}

describe('Sidebar', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function create(): void {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('puts the collapse button below what the sidebar holds', () => {
    create();
    const aside = element().querySelector('aside')!;
    expect(aside.lastElementChild?.classList).toContain('collapse');
    expect(aside.querySelector('.content .pick')).not.toBeNull();
  });

  it('collapses with « and expands with », and keeps the choice for the next visit', () => {
    create();
    const toggle = element().querySelector<HTMLButtonElement>('.collapse')!;
    expect(toggle.textContent).toContain('«');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(element().querySelector('app-sidebar')?.classList).toContain('collapsed');
    expect(toggle.textContent).toContain('»');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(localStorage.getItem(COLLAPSED_STORAGE_KEY)).toBe('true');

    TestBed.resetTestingModule();
    create();
    expect(element().querySelector('app-sidebar')?.classList).toContain('collapsed');
  });

  it('is never compact over the page on narrow screens', () => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, 'true');
    let listener: ((event: MediaQueryListEvent) => void) | undefined;
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_: string, l: (event: MediaQueryListEvent) => void) => (listener = l),
      removeEventListener: () => undefined,
    }));
    const state = TestBed.inject(SidebarState);

    expect(state.collapsed()).toBe(true);
    expect(state.compact()).toBe(false);

    listener!({ matches: true } as MediaQueryListEvent);
    expect(state.compact()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('starts expanded when the browser keeps nothing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    create();

    expect(element().querySelector('app-sidebar')?.classList).not.toContain('collapsed');
    vi.restoreAllMocks();
  });

  it('takes the focus when it opens over the page', () => {
    create();
    TestBed.inject(SidebarState).open.set(true);
    fixture.detectChanges();

    expect(document.activeElement).toBe(element().querySelector('.pick'));
  });

  it('closes over the page when something in it is picked, the page is clicked or Escape is pressed', () => {
    create();
    const state = TestBed.inject(SidebarState);
    const open = () => {
      state.open.set(true);
      fixture.detectChanges();
    };

    open();
    element().querySelector<HTMLButtonElement>('.pick')!.click();
    expect(state.open()).toBe(false);

    open();
    element().querySelector<HTMLElement>('.scrim')!.click();
    expect(state.open()).toBe(false);

    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(state.open()).toBe(false);

    open();
    element().querySelector<HTMLButtonElement>('.collapse')!.click();
    expect(state.open()).toBe(true);
  });
});
