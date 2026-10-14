import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  MAX_ROWS,
  ScrollRows,
  moreAbove,
  moreBelow,
  rowsHeight,
  sharesRow,
  wheelPixels,
} from './scroll-rows';

/** Rows 20 pixels high, one under the other. */
function rows(count: number): { offsetTop: number; offsetHeight: number }[] {
  return Array.from({ length: count }, (_, i) => ({ offsetTop: i * 20, offsetHeight: 20 }));
}

describe('rowsHeight', () => {
  it('keeps the natural height while all rows fit', () => {
    expect(rowsHeight([])).toBeNull();
    expect(rowsHeight(rows(MAX_ROWS))).toBeNull();
  });

  it('ends below the eighth row when there are more', () => {
    expect(rowsHeight(rows(MAX_ROWS + 1))).toBe(160);
    expect(rowsHeight(rows(40))).toBe(160);
  });

  it('counts rows of different heights as they are', () => {
    const mixed = [
      { offsetTop: 0, offsetHeight: 60 },
      { offsetTop: 76, offsetHeight: 40 },
      { offsetTop: 132, offsetHeight: 60 },
    ];
    expect(rowsHeight(mixed, 2)).toBe(116);
  });
});

describe('moreBelow', () => {
  it('tells whether rows are hidden below the visible part', () => {
    expect(moreBelow({ scrollTop: 0, clientHeight: 160, scrollHeight: 400 })).toBe(true);
    expect(moreBelow({ scrollTop: 200, clientHeight: 160, scrollHeight: 400 })).toBe(true);
    expect(moreBelow({ scrollTop: 240, clientHeight: 160, scrollHeight: 400 })).toBe(false);
    // Scrolled to a fraction of a pixel from the end, as zoomed pages do.
    expect(moreBelow({ scrollTop: 239.5, clientHeight: 160, scrollHeight: 400 })).toBe(false);
  });
});

describe('moreAbove', () => {
  it('tells whether rows are hidden above the visible part', () => {
    expect(moreAbove({ scrollTop: 0 })).toBe(false);
    expect(moreAbove({ scrollTop: 0.5 })).toBe(false);
    expect(moreAbove({ scrollTop: 20 })).toBe(true);
  });
});

describe('wheelPixels', () => {
  it('turns lines and pages into pixels', () => {
    expect(wheelPixels({ deltaY: 100, deltaMode: 0 }, 160)).toBe(100);
    expect(wheelPixels({ deltaY: 3, deltaMode: 1 }, 160)).toBe(48);
    expect(wheelPixels({ deltaY: -1, deltaMode: 2 }, 160)).toBe(-160);
  });
});

@Component({
  imports: [ScrollRows],
  template: `
    <div class="card">
      <h2>Temperature {{ other() }}</h2>
      <app-scroll-rows>
        @for (name of names(); track $index) {
          <p class="row">{{ name }}</p>
        }
      </app-scroll-rows>
    </div>
  `,
})
class Host {
  readonly names = signal(['cpu_thermal']);
  /** Something else on the page, outside the list. */
  readonly other = signal(0);
}

describe('sharesRow', () => {
  function card(width: number, rowWidth: number): Element {
    const row = { clientWidth: rowWidth } as HTMLElement;
    return { parentElement: row, getBoundingClientRect: () => ({ width }) } as unknown as Element;
  }

  it('tells a card next to others from one as wide as its row', () => {
    expect(sharesRow(card(300, 1000))).toBe(true);
    expect(sharesRow(card(1000, 1000))).toBe(false);
    // Rounding of a card that fills the row.
    expect(sharesRow(card(999.5, 1000))).toBe(false);
  });
});

describe('ScrollRows', () => {
  let scrollTop = 0;
  // The card's width; the row it is in is 1000 pixels wide.
  let cardWidth = 300;

  beforeEach(() => {
    scrollTop = 0;
    cardWidth = 300;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ width: cardWidth }) as DOMRect,
    );
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    // jsdom lays nothing out: each row is 20 pixels high, and the list shows what its max-height lets it.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(20);
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return [...(this.parentElement?.children ?? [])].indexOf(this) * 20;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.children.length * 20;
    });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return parseFloat(this.style.maxHeight) || this.children.length * 20;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollTop', 'get').mockImplementation(() => scrollTop);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function render(count: number) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.names.set(Array.from({ length: count }, (_, i) => `sensor ${i}`));
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      list: element.querySelector<HTMLElement>('.list')!,
      arrow: () => element.querySelector<HTMLButtonElement>('.more'),
      up: () => element.querySelector<HTMLButtonElement>('.less'),
      heading: element.querySelector('h2')!,
    };
  }

  it('keeps up to eight rows as they are, without an arrow', () => {
    const { list, arrow } = render(MAX_ROWS);
    expect(list.style.maxHeight).toBe('');
    expect(arrow()).toBeNull();
    expect(list.hasAttribute('tabindex')).toBe(false);
  });

  it('lets the keyboard scroll a list with more rows both ways', () => {
    const { list } = render(12);
    expect(list.getAttribute('tabindex')).toBe('0');
  });

  it('shows eight of more rows and an arrow that scrolls down a page', () => {
    const { list, arrow } = render(12);
    expect(list.style.maxHeight).toBe('160px');
    expect(arrow()?.classList).not.toContain('hidden');
    expect(arrow()?.getAttribute('aria-label')).toBe('Scroll down for more');

    list.scrollBy = vi.fn();
    arrow()!.click();
    expect(list.scrollBy).toHaveBeenCalledWith({ top: 160, behavior: 'smooth' });
  });

  it('hides the arrow at the bottom, keeping its room, and shows it again above', () => {
    const { fixture, list, arrow } = render(12);

    scrollTop = 80;
    list.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(arrow()?.classList).toContain('hidden');

    scrollTop = 40;
    list.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(arrow()?.classList).not.toContain('hidden');
  });

  it('shows an arrow over the top once scrolled, which scrolls up a page', () => {
    const { fixture, list, up } = render(12);
    expect(up()?.classList).toContain('hidden');

    scrollTop = 40;
    list.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(up()?.classList).not.toContain('hidden');
    expect(up()?.getAttribute('aria-label')).toBe('Scroll up for more');

    list.scrollBy = vi.fn();
    up()!.click();
    expect(list.scrollBy).toHaveBeenCalledWith({ top: -160, behavior: 'smooth' });
  });

  it('scrolls the list, not the page, with the wheel over the rest of the card', async () => {
    const { fixture, list, heading } = render(12);
    await fixture.whenStable();
    list.scrollBy = vi.fn();

    const overHeading = new WheelEvent('wheel', {
      deltaY: 3,
      deltaMode: 1,
      cancelable: true,
      bubbles: true,
    });
    heading.dispatchEvent(overHeading);
    expect(overHeading.defaultPrevented).toBe(true);
    expect(list.scrollBy).toHaveBeenCalledWith({ top: 48 });

    // Over the list the browser scrolls it itself.
    const overList = new WheelEvent('wheel', { deltaY: 3, cancelable: true, bubbles: true });
    list.firstElementChild!.dispatchEvent(overList);
    expect(overList.defaultPrevented).toBe(false);
    expect(list.scrollBy).toHaveBeenCalledTimes(1);
  });

  it('leaves the wheel and swipes to the page in a card as wide as its row, as on a phone', async () => {
    cardWidth = 1000;
    const { fixture, list, heading } = render(12);
    await fixture.whenStable();
    list.scrollBy = vi.fn();

    const event = new WheelEvent('wheel', { deltaY: 3, cancelable: true, bubbles: true });
    heading.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(list.scrollBy).not.toHaveBeenCalled();
    expect(list.classList).not.toContain('lock');
  });

  it('keeps the wheel at the ends of a list in a card next to others', async () => {
    const { fixture, list } = render(12);
    await fixture.whenStable();
    expect(list.classList).toContain('lock');
  });

  it('leaves the wheel to the page while all rows fit', async () => {
    const { fixture, heading } = render(MAX_ROWS);
    await fixture.whenStable();
    const event = new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true });
    heading.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('gives the focus to the list when the arrow that has it hides at the end', () => {
    const { fixture, list, arrow } = render(12);
    arrow()!.focus();
    scrollTop = 80;
    list.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(document.activeElement).toBe(list);
  });

  it('measures again when the rows change, not with every render of the page', () => {
    const { fixture, list, arrow } = render(MAX_ROWS);
    // Measuring asks how wide the card is, to tell whether it shares its row.
    const measured = vi.mocked(Element.prototype.getBoundingClientRect);
    measured.mockClear();

    // Another part of the page drew again; this list's rows are the same.
    fixture.componentInstance.other.set(1);
    fixture.detectChanges();
    expect(measured).not.toHaveBeenCalled();

    fixture.componentInstance.names.update((names) => [...names, 'nvme Composite']);
    fixture.detectChanges();
    expect(measured).toHaveBeenCalled();
    expect(list.style.maxHeight).toBe('160px');
    expect(arrow()).not.toBeNull();
  });

  it('lets the list grow again when rows go', () => {
    const { fixture, list, arrow } = render(12);
    fixture.componentInstance.names.set(['cpu_thermal', 'nvme Composite']);
    fixture.detectChanges();
    expect(list.style.maxHeight).toBe('');
    expect(arrow()).toBeNull();
  });
});
