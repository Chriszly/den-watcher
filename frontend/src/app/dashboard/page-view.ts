import { DOCUMENT, Component, Injectable, inject, signal } from '@angular/core';

import { readStored, store } from '../browser';
import { I18n } from '../i18n/i18n';

/** How the page shows a device's values: as cards by category, or as one timeline of every value. */
export type View = 'cards' | 'timeline';

/** Where the picked view is kept between visits, in localStorage. */
export const VIEW_STORAGE_KEY = 'view';
/** Where the mascot's switch to the timeline was kept before the view could be picked. */
export const OLD_TIMELINE_STORAGE_KEY = 'timeline';

function storedView(window: Window | null): View {
  const view = readStored(window, VIEW_STORAGE_KEY);
  if (view === 'cards' || view === 'timeline') {
    return view;
  }
  return readStored(window, OLD_TIMELINE_STORAGE_KEY) === 'true' ? 'timeline' : 'cards';
}

/** The view the page shows; kept for the next visit in this browser. */
@Injectable({ providedIn: 'root' })
export class PageView {
  private readonly window = inject(DOCUMENT).defaultView;
  readonly view = signal<View>(storedView(this.window));

  pick(view: View): void {
    this.view.set(view);
    store(this.window, VIEW_STORAGE_KEY, view);
  }
}

/** The views in the order the switch shows them, each with its label and the path of its icon. */
const VIEWS = [
  {
    view: 'cards',
    label: 'view.cards',
    icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  },
  { view: 'timeline', label: 'view.timeline', icon: 'M3 17l5-6 4 3 4-7 5 6' },
] as const;

/** The buttons that pick the view, one of them pressed. On a phone they show only their icons. */
@Component({
  selector: 'app-view-switch',
  template: `
    @for (v of views; track v.view) {
      <button
        type="button"
        [attr.aria-pressed]="pageView.view() === v.view"
        [title]="i18n.t(v.label)"
        (click)="pageView.pick(v.view)"
      >
        <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path [attr.d]="v.icon" />
        </svg>
        <span class="label">{{ i18n.t(v.label) }}</span>
      </button>
    }
  `,
  styleUrl: './page-view.css',
  host: { class: 'choices', role: 'group', '[attr.aria-label]': "i18n.t('view.label')" },
})
export class ViewSwitch {
  protected readonly pageView = inject(PageView);
  protected readonly i18n = inject(I18n);
  protected readonly views = VIEWS;
}
