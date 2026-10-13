import {
  DestroyRef,
  Directive,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';

import { ThemeService } from '../theme/theme';

/** A point of a line, as a fraction of the plot: 0 is the left and the top, 1 the right and the bottom. */
export interface PlotPoint {
  x: number;
  y: number;
}

/** One line to draw: its runs of joined points, split where values are missing. */
export interface CanvasLine {
  segments: PlotPoint[][];
  /** The color, by its place in the charts' palette (the `series-N` classes). */
  series: number;
  dashed: boolean;
}

/**
 * How far the canvas reaches past the plot on every side, in CSS pixels, so a line at the very
 * top or bottom is drawn whole instead of cut in half.
 */
const BLEED = 4;

/**
 * Draws lines on a canvas with Canvas 2D, sharp on high-density screens: the canvas takes as many
 * device pixels as it covers and is redrawn when its size, the lines or the color scheme change.
 * With `grid`, it also draws dotted lines at the top and middle and a solid baseline. The colors
 * come from the page's styles, so they follow light and dark mode.
 */
@Directive({
  selector: 'canvas[appChartCanvas]',
  host: {
    // Over the whole of the plot, which is the nearest positioned box, and past it by BLEED.
    style: `position: absolute; display: block; top: ${-BLEED}px; left: ${-BLEED}px;
      width: calc(100% + ${2 * BLEED}px); height: calc(100% + ${2 * BLEED}px);`,
  },
})
export class ChartCanvas {
  private readonly canvas = inject<ElementRef<HTMLCanvasElement>>(ElementRef).nativeElement;
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lines = input.required<CanvasLine[]>({ alias: 'appChartCanvas' });
  readonly grid = input(false);

  /** The canvas's size in CSS pixels, once it is laid out. */
  private size: { width: number; height: number } | null = null;

  constructor() {
    effect(() => {
      // Redraws when the page switches between light and dark, as the colors change with it.
      this.theme.scheme();
      this.draw(this.lines(), this.grid());
    });

    afterNextRender(() => {
      // jsdom, which the tests run in, has no ResizeObserver; there is nothing to draw on there.
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(([entry]) => {
        const box = entry.contentRect;
        this.size = { width: box.width, height: box.height };
        this.draw(this.lines(), this.grid());
      });
      observer.observe(this.canvas);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private draw(lines: CanvasLine[], grid: boolean): void {
    const size = this.size;
    const context = size && this.canvas.getContext('2d');
    if (!size || !context) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(size.width * ratio);
    this.canvas.height = Math.round(size.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    const width = size.width - 2 * BLEED;
    const height = size.height - 2 * BLEED;
    if (width <= 0 || height <= 0) {
      return;
    }
    const colors = readColors(this.canvas, [
      ['', 'var(--mat-sys-outline-variant)'],
      ['', 'var(--mat-sys-outline)'],
      ...lines.map((line): [string, string] => [`series-${line.series}`, 'var(--color)']),
    ]);

    if (grid) {
      // Thin lines sit in the middle of a device pixel, so they stay one pixel wide and sharp.
      const crisp = (y: number) => (Math.floor(y * ratio) + 0.5) / ratio;
      context.lineWidth = 1 / ratio;
      context.setLineDash([2, 4]);
      context.strokeStyle = colors[0];
      context.beginPath();
      for (const y of [BLEED, BLEED + height / 2]) {
        context.moveTo(BLEED, crisp(y));
        context.lineTo(BLEED + width, crisp(y));
      }
      context.stroke();
      context.setLineDash([]);
      context.strokeStyle = colors[1];
      context.beginPath();
      context.moveTo(BLEED, crisp(BLEED + height - 1 / ratio));
      context.lineTo(BLEED + width, crisp(BLEED + height - 1 / ratio));
      context.stroke();
    }

    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    lines.forEach((line, index) => {
      context.setLineDash(line.dashed ? [6, 5] : []);
      context.strokeStyle = colors[index + 2];
      context.beginPath();
      for (const segment of line.segments) {
        segment.forEach((point, i) => {
          const x = BLEED + point.x * width;
          const y = BLEED + point.y * height;
          if (i === 0) {
            context.moveTo(x, y);
          }
          // A lone point gets a line of no length, which the round line caps show as a dot.
          context.lineTo(x, y);
        });
      }
      context.stroke();
    });
  }
}

/**
 * Reads colors from the page's styles as they apply at `element`: each a CSS color, such as a
 * variable, with a class that sets it or none. They follow light and dark mode as the page does.
 */
function readColors(element: HTMLElement, wanted: [className: string, value: string][]): string[] {
  const probe = element.ownerDocument.createElement('span');
  probe.style.display = 'none';
  (element.parentElement ?? element).append(probe);
  try {
    return wanted.map(([className, value]) => {
      probe.className = className;
      probe.style.color = value;
      return getComputedStyle(probe).color;
    });
  } finally {
    probe.remove();
  }
}
