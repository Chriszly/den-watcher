import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { AlertLevel } from './alert';
import { AlertService, worstLevel } from './alerts';

/** The colors of the dot on the favicon: bright enough on light and dark tab bars alike. */
const DOT_COLORS: Record<AlertLevel, string> = { alert: '#e5372b', warning: '#f0a030' };

/**
 * Tells about the alerts that last in the browser's tab, also while it is in the background: the
 * title starts with their number, such as "(2) Den-Watcher", and the favicon gets a red dot, or an
 * amber one when all of them are warnings.
 */
@Injectable({ providedIn: 'root' })
export class AlertTab {
  private readonly document = inject(DOCUMENT);
  private readonly alerts = inject(AlertService);
  private readonly title = this.document.title;

  /** The favicon without a dot, as SVG markup; set once the mascot is drawn. */
  readonly icon = signal<string | null>(null);

  private readonly level = computed(() => worstLevel(this.alerts.active()));

  constructor() {
    effect(() => {
      const count = this.alerts.active().length;
      this.document.title = count > 0 ? `(${count}) ${this.title}` : this.title;
    });
    effect(() => {
      const icon = this.icon();
      const link = this.document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (icon !== null && link) {
        link.href = 'data:image/svg+xml,' + encodeURIComponent(withDot(icon, this.level()));
      }
    });
  }
}

/** The SVG markup of a 32 by 32 icon with a dot in its top right corner for level, if any. */
export function withDot(svg: string, level: AlertLevel | null): string {
  if (level === null) {
    return svg;
  }
  const dot = `<circle cx="25" cy="7" r="6.5" fill="${DOT_COLORS[level]}" stroke="#fff" stroke-width="1.5"/>`;
  const end = svg.lastIndexOf('</svg>');
  return end < 0 ? svg : svg.slice(0, end) + dot + svg.slice(end);
}
