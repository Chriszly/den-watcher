import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from '../theme/theme';
import { CanvasLine, ChartCanvas } from './chart-canvas';

/** Stands in for the browser's ResizeObserver, which jsdom lacks; tests report sizes by hand. */
class FakeResizeObserver {
  static last: FakeResizeObserver | undefined;
  constructor(readonly report: ResizeObserverCallback) {
    FakeResizeObserver.last = this;
  }
  observe = vi.fn();
  disconnect = vi.fn();
  resize(width: number, height: number): void {
    this.report(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

/** Stands in for a canvas's 2D context, which jsdom lacks, and writes down what is drawn. */
class FakeContext {
  readonly calls: string[] = [];
  strokeStyle = '';
  fillStyle = '';
  lineWidth = 0;
  lineCap = '';
  lineJoin = '';
  setTransform(a: number): void {
    this.calls.push(`scale ${a}`);
  }
  clearRect(): void {
    this.calls.push('clear');
  }
  setLineDash(dash: number[]): void {
    this.calls.push(`dash ${dash.join(' ')}`);
  }
  beginPath = vi.fn();
  moveTo(x: number, y: number): void {
    this.calls.push(`M${x} ${y}`);
  }
  lineTo(x: number, y: number): void {
    this.calls.push(`L${x} ${y}`);
  }
  arc(x: number, y: number, radius: number): void {
    this.calls.push(`arc ${x} ${y} ${radius}`);
  }
  fill(): void {
    this.calls.push('fill');
  }
  stroke(): void {
    this.calls.push(`stroke ${this.strokeStyle} ${this.lineWidth}`);
  }
}

@Component({
  imports: [ChartCanvas],
  template: `<div style="position: relative">
    <canvas [appChartCanvas]="lines()" [grid]="grid()"></canvas>
  </div>`,
})
class Host {
  readonly lines = signal<CanvasLine[]>([]);
  readonly grid = signal(false);
}

describe('ChartCanvas', () => {
  let context: FakeContext;

  beforeEach(() => {
    context = new FakeContext();
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('devicePixelRatio', 2);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function render(lines: CanvasLine[], grid = false) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.lines.set(lines);
    fixture.componentInstance.grid.set(grid);
    fixture.detectChanges();
    return fixture;
  }

  it('draws nothing until it knows its size', () => {
    render([{ segments: [[{ x: 0, y: 0 }]], series: 0, dashed: false }]);
    expect(context.calls).toEqual([]);
  });

  it('draws the lines in device pixels, past the plot by a few pixels on every side', () => {
    const fixture = render([
      {
        segments: [
          [
            { x: 0, y: 1 },
            { x: 0.5, y: 0 },
          ],
          [{ x: 1, y: 0.5 }],
        ],
        series: 2,
        dashed: true,
      },
    ]);
    FakeResizeObserver.last!.resize(108, 58);

    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    expect([canvas.width, canvas.height]).toEqual([216, 116]);
    expect(context.calls).toEqual([
      'scale 2',
      'clear',
      'dash 6 5',
      'M4 54',
      'L54 4',
      'M104 29',
      expect.stringMatching(/^stroke .* 2$/),
      // A lone point is drawn as a dot as wide as the line.
      'M105 29',
      'arc 104 29 1',
      'fill',
    ]);
  });

  it('draws the grid in thin lines that stay sharp', () => {
    render([], true);
    FakeResizeObserver.last!.resize(108, 58);

    expect(context.calls).toEqual([
      'scale 2',
      'clear',
      'dash 2 4',
      'M4 4.25',
      'L104 4.25',
      'M4 29.25',
      'L104 29.25',
      expect.stringMatching(/^stroke .* 0.5$/),
      'dash ',
      'M4 53.75',
      'L104 53.75',
      expect.stringMatching(/^stroke .* 0.5$/),
    ]);
  });

  it('draws again when the lines or the color scheme change', () => {
    const fixture = render([]);
    FakeResizeObserver.last!.resize(108, 58);
    context.calls.length = 0;

    fixture.componentInstance.lines.set([
      { segments: [[{ x: 0, y: 0 }]], series: 0, dashed: false },
    ]);
    fixture.detectChanges();
    expect(context.calls).toContain('M4 4');

    context.calls.length = 0;
    TestBed.inject(ThemeService).toggle();
    fixture.detectChanges();
    expect(context.calls).toContain('M4 4');
    document.documentElement.style.colorScheme = '';
  });
  it('makes a new canvas only when its size changes, and reads the colors once per scheme', () => {
    const fixture = render([{ segments: [[{ x: 0, y: 0 }]], series: 0, dashed: false }]);
    const sizes = vi.spyOn(HTMLCanvasElement.prototype, 'width', 'set');
    const styles = vi.spyOn(window, 'getComputedStyle');
    FakeResizeObserver.last!.resize(108, 58);
    expect(sizes).toHaveBeenCalledTimes(1);
    expect(styles).toHaveBeenCalledTimes(3);

    fixture.componentInstance.lines.set([
      { segments: [[{ x: 1, y: 1 }]], series: 0, dashed: false },
    ]);
    fixture.detectChanges();
    expect(sizes).toHaveBeenCalledTimes(1);
    expect(styles).toHaveBeenCalledTimes(3);

    TestBed.inject(ThemeService).toggle();
    fixture.detectChanges();
    expect(styles).toHaveBeenCalledTimes(6);
    document.documentElement.style.colorScheme = '';
  });

  it('draws again on a screen of another pixel density', () => {
    let changed: (() => void) | undefined;
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_: string, listener: () => void) => {
        if (query.includes('resolution')) {
          changed ??= listener;
        }
      },
      removeEventListener: vi.fn(),
    }));
    render([{ segments: [[{ x: 0, y: 0 }]], series: 0, dashed: false }]);
    FakeResizeObserver.last!.resize(108, 58);
    context.calls.length = 0;

    vi.stubGlobal('devicePixelRatio', 3);
    changed!();
    expect(context.calls[0]).toBe('scale 3');
  });

  it('takes no pointer, so the part past the plot does not act as the chart', () => {
    const fixture = render([]);
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    expect(canvas.style.pointerEvents).toBe('none');
  });
});
