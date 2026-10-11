import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injectable,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

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
  private readonly wideQuery = this.document.defaultView?.matchMedia?.('(width >= 48rem)');
  /** Whether the screen is wide enough for the sidebar beside the page. */
  private readonly wide = signal(this.wideQuery?.matches ?? true);

  readonly collapsed = signal(this.stored());
  /** Collapsed counts only on wide screens; over the page on narrow ones it is always open wide. */
  readonly compact = computed(() => this.collapsed() && this.wide());
  readonly open = signal(false);

  constructor() {
    const query = this.wideQuery;
    if (query) {
      const update = (event: MediaQueryListEvent) => this.wide.set(event.matches);
      query.addEventListener('change', update);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', update));
    }
  }

  toggleCollapsed(): void {
    this.collapsed.update((collapsed) => !collapsed);
    try {
      this.document.defaultView?.localStorage.setItem(
        COLLAPSED_STORAGE_KEY,
        String(this.collapsed()),
      );
    } catch {
      // Without storage (a private window, blocked site data) the choice lasts for this visit.
    }
  }

  private stored(): boolean {
    try {
      return this.document.defaultView?.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}

/**
 * A sidebar at the left of the page for what is put in it. On wide screens a button at its top
 * collapses it to a rail, marked », and expands it again, marked «. On narrow screens it opens
 * over the page and takes the focus, and closes again when anything in it is picked, the page
 * beside it is clicked or Escape is pressed.
 */
@Component({
  selector: 'app-sidebar',
  template: `
    <aside #aside [attr.aria-label]="label()">
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
      <ng-content />
    </aside>
    <div class="scrim" aria-hidden="true" (click)="state.open.set(false)"></div>
  `,
  styleUrl: './sidebar.css',
  host: {
    '[class.collapsed]': 'state.collapsed()',
    '[class.open]': 'state.open()',
    '(click)': 'closeOnPick($event)',
    '(document:keydown.escape)': 'state.open.set(false)',
  },
})
export class Sidebar {
  /** What the sidebar holds, for screen readers. */
  readonly label = input.required<string>();

  protected readonly state = inject(SidebarState);
  protected readonly i18n = inject(I18n);
  private readonly aside = viewChild.required<ElementRef<HTMLElement>>('aside');

  constructor() {
    // Opened over the page, the sidebar takes the focus, so the keyboard goes on in it.
    effect(() => {
      if (this.state.open()) {
        this.aside().nativeElement.querySelector<HTMLElement>('button:not(.collapse)')?.focus();
      }
    });
  }

  /** On narrow screens, picking a device or the comparison shows it in place of the sidebar. */
  protected closeOnPick(event: Event): void {
    const button = (event.target as Element).closest('button');
    if (button && !button.classList.contains('collapse')) {
      this.state.open.set(false);
    }
  }
}
