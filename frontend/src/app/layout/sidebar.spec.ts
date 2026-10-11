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

  it('starts expanded when the browser keeps nothing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    create();

    expect(element().querySelector('app-sidebar')?.classList).not.toContain('collapsed');
    vi.restoreAllMocks();
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
    element()
      .querySelector('aside')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(state.open()).toBe(false);

    open();
    element().querySelector<HTMLButtonElement>('.collapse')!.click();
    expect(state.open()).toBe(true);
  });
});
