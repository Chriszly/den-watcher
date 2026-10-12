import { Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';

import { I18n } from '../i18n/i18n';
import { Sparkline } from './sparkline';
import { MIN_ZOOM_SECONDS, Stretch } from './timeline-zoom';
import { TimelineLine } from './timeline-row';

/** What a drag on the overview does: moves the window, moves one of its edges or draws a new one. */
type DragMode = 'move' | 'start' | 'end' | 'draw';

interface Drag {
  mode: DragMode;
  /** Where the drag started, in Unix seconds. */
  start: number;
  /** The window when the drag started. */
  origin: Stretch;
  moved: boolean;
}

/**
 * A strip of one value over the whole range, with a window on it that marks the stretch the
 * timeline's rows show. Dragging the window moves it, dragging its edges makes it longer or
 * shorter, and dragging anywhere else draws a new one; while the window covers the whole range,
 * any drag draws one. A click beside the window moves it there. The arrow keys move a focused
 * window. Each change is reported once the pointer is let go.
 */
@Component({
  selector: 'app-timeline-overview',
  imports: [Sparkline],
  template: `
    <app-sparkline
      [points]="line().points"
      [from]="from()"
      [to]="to()"
      [step]="step()"
      [unit]="line().unit"
      [series]="line().series"
    />
    <div class="dim" [style.left.%]="0" [style.width.%]="left()"></div>
    <div class="dim" [style.left.%]="left() + width()" [style.right.%]="0"></div>
    <div
      class="window"
      tabindex="0"
      [attr.aria-label]="i18n.t('timeline.window')"
      [style.left.%]="left()"
      [style.width.%]="width()"
      (keydown)="key($event)"
    >
      <span class="edge start" data-edge="start"></span>
      <span class="edge end" data-edge="end"></span>
    </div>
  `,
  styleUrl: './timeline-overview.css',
  host: {
    '(pointerdown)': 'down($event)',
    '(pointermove)': 'drag($event)',
    '(pointerup)': 'up($event)',
    '(pointercancel)': 'cancel()',
  },
})
export class TimelineOverview {
  protected readonly i18n = inject(I18n);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The value drawn over the whole range. */
  readonly line = input.required<TimelineLine>();
  readonly from = input.required<number>();
  readonly to = input.required<number>();
  readonly step = input.required<number>();
  /** The stretch the rows show, or null for the whole range. */
  readonly window = input<Stretch | null>(null);
  /** A stretch picked on the strip. */
  readonly picked = output<Stretch>();

  private dragging: Drag | null = null;
  /** The window while it is dragged, before it is let go. */
  private readonly dragged = signal<Stretch | null>(null);

  private readonly shown = computed(
    () => this.dragged() ?? this.window() ?? { from: this.from(), to: this.to() },
  );

  /** Where the window starts, in percent of the strip. */
  protected readonly left = computed(() => this.percent(this.shown().from));
  protected readonly width = computed(() => this.percent(this.shown().to) - this.left());

  protected down(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement;
    const edge = target.dataset['edge'] as 'start' | 'end' | undefined;
    const inWindow = this.window() !== null && target.closest('.window') !== null;
    this.host.setPointerCapture?.(event.pointerId);
    this.dragging = {
      mode: edge ?? (inWindow ? 'move' : 'draw'),
      start: this.timeAt(event),
      origin: this.shown(),
      moved: false,
    };
  }

  protected drag(event: PointerEvent): void {
    const drag = this.dragging;
    if (!drag) {
      return;
    }
    const time = this.timeAt(event);
    // A small shake of the pointer is still a click.
    if (!drag.moved && Math.abs(time - drag.start) < (this.to() - this.from()) / 200) {
      return;
    }
    drag.moved = true;
    const { origin } = drag;
    const moved = time - drag.start;
    switch (drag.mode) {
      case 'move':
        this.dragged.set(this.within({ from: origin.from + moved, to: origin.to + moved }));
        break;
      case 'start':
        this.dragged.set({ from: Math.min(time, origin.to - MIN_ZOOM_SECONDS), to: origin.to });
        break;
      case 'end':
        this.dragged.set({ from: origin.from, to: Math.max(time, origin.from + MIN_ZOOM_SECONDS) });
        break;
      case 'draw':
        this.dragged.set({ from: Math.min(drag.start, time), to: Math.max(drag.start, time) });
    }
  }

  protected up(event: PointerEvent): void {
    const drag = this.dragging;
    const dragged = this.dragged();
    this.cancel();
    const window = this.window();
    if (drag?.moved && dragged) {
      this.picked.emit(dragged);
    } else if (drag && drag.mode === 'draw' && window) {
      const time = this.timeAt(event);
      const half = (window.to - window.from) / 2;
      this.picked.emit(this.within({ from: time - half, to: time + half }));
    }
  }

  protected cancel(): void {
    this.dragging = null;
    this.dragged.set(null);
  }

  /** Moves a window a tenth of its length with the arrow keys. */
  protected key(event: KeyboardEvent): void {
    const window = this.window();
    const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!window || !direction) {
      return;
    }
    event.preventDefault();
    const moved = ((window.to - window.from) / 10) * direction;
    this.picked.emit(this.within({ from: window.from + moved, to: window.to + moved }));
  }

  /** The stretch moved as little as needed to lie within the whole range. */
  private within({ from, to }: Stretch): Stretch {
    const shift = Math.max(this.from() - from, 0) + Math.min(this.to() - to, 0);
    return { from: from + shift, to: to + shift };
  }

  private percent(time: number): number {
    const fraction = (time - this.from()) / (this.to() - this.from());
    return Math.min(1, Math.max(0, fraction)) * 100;
  }

  private timeAt(event: PointerEvent): number {
    const area = this.host.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - area.left) / area.width));
    return this.from() + fraction * (this.to() - this.from());
  }
}
