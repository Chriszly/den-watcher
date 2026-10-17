import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  Injectable,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { mediaMatches, readStored, store } from '../browser';
import { I18n } from '../i18n/i18n';

/** Where the choice to collapse the sidebar is kept between visits, in the browser's localStorage. */
export const COLLAPSED_STORAGE_KEY = 'sidebarCollapsed';

/**
 * Whether the sidebar is collapsed to a narrow rail on wide screens, kept for the next visit, and
 * whether it is open over the page on narrow screens, where it is hidden otherwise.
 */
@Injectable({ providedIn: 'root' })
export class SidebarState {
  private readonly document = inject(DOCUMENT);
  /** Whether the screen is wide enough for the sidebar beside the page. */
  private readonly wide = mediaMatches('(width >= 48rem)', true);

  readonly collapsed = signal(
    readStored(this.document.defaultView, COLLAPSED_STORAGE_KEY) === 'true',
  );
  /** Collapsed counts only on wide screens; over the page on narrow ones it is always open wide. */
  readonly compact = computed(() => this.collapsed() && this.wide());
  readonly open = signal(false);

  toggleCollapsed(): void {
    this.collapsed.update((collapsed) => !collapsed);
    store(this.document.defaultView, COLLAPSED_STORAGE_KEY, String(this.collapsed()));
  }
}

/**
 * A sidebar at the left of the page for what is put in it. On wide screens a button across its
 * bottom collapses it to a rail, marked «, and expands it again, marked ». On narrow screens it opens
 * over the page and takes the focus, and closes again when anything in it is picked, the page
 * beside it is clicked or Escape is pressed, giving the focus back to what opened it.
 */
@Component({
  selector: 'app-sidebar',
  template: `
    <aside #aside [attr.aria-label]="label()">
      <div class="content"><ng-content /></div>
      <button
        type="button"
        class="collapse"
        [attr.aria-expanded]="!state.collapsed()"
        [title]="i18n.t(state.collapsed() ? 'sidebar.expand' : 'sidebar.collapse')"
        (click)="state.toggleCollapsed()"
      >
        <span aria-hidden="true">{{ state.collapsed() ? '»' : '«' }}</span>
        <span class="visually-hidden">{{
          i18n.t(state.collapsed() ? 'sidebar.expand' : 'sidebar.collapse')
        }}</span>
      </button>
    </aside>
    <div class="scrim" aria-hidden="true" (click)="close()"></div>
  `,
  styleUrl: './sidebar.css',
  host: {
    '[class.collapsed]': 'state.collapsed()',
    '[class.open]': 'state.open()',
    '(click)': 'closeOnPick($event)',
    '(document:keydown.escape)': 'close()',
  },
})
export class Sidebar {
  /** What the sidebar holds, for screen readers. */
  readonly label = input.required<string>();

  protected readonly state = inject(SidebarState);
  protected readonly i18n = inject(I18n);
  private readonly document = inject(DOCUMENT);
  private readonly aside = viewChild.required<ElementRef<HTMLElement>>('aside');
  /** What had the focus when the sidebar opened over the page: the header's menu button. */
  private opener: HTMLElement | null = null;

  constructor() {
    // Opened over the page, the sidebar takes the focus, so the keyboard goes on in it.
    effect(() => {
      if (this.state.open()) {
        const focused = this.document.activeElement;
        this.opener = focused instanceof HTMLElement ? focused : null;
        this.aside().nativeElement.querySelector<HTMLElement>('button:not(.collapse)')?.focus();
      }
    });
  }

  /**
   * Closes the sidebar over the page. The focus, if it was in the sidebar, goes back to what opened
   * it, so it is not left on a button that is hidden.
   */
  protected close(): void {
    if (!this.state.open()) {
      return;
    }
    this.state.open.set(false);
    if (this.aside().nativeElement.contains(this.document.activeElement)) {
      this.opener?.focus();
    }
    this.opener = null;
  }

  /** On narrow screens, picking a device or the comparison shows it in place of the sidebar. */
  protected closeOnPick(event: Event): void {
    const button = (event.target as Element).closest('button');
    if (button && !button.classList.contains('collapse')) {
      this.close();
    }
  }
}
