import { Component, afterEveryRender, signal } from '@angular/core';

import { CardTip } from './card-tip';

/** An (i) next to a card's title that tells what the card shows, as a {@link CardTip}. */
@Component({
  selector: 'app-card-info',
  templateUrl: './card-info.html',
  styleUrl: './card-info.css',
})
export class CardInfo extends CardTip {
  /** The card's title, for the button's name, as the heading the (i) stands in shows it. */
  protected readonly title = signal('');

  constructor() {
    super();
    // The heading is named by its title alone, without the (i)'s name after it.
    afterEveryRender(() => {
      const title = headingTitle(this.host);
      this.title.set(title);
      if (this.host.parentElement?.getAttribute('aria-label') !== title) {
        this.host.parentElement?.setAttribute('aria-label', title);
      }
    });
  }
}

/** The text of the heading an element stands in, without the element's own text. */
export function headingTitle(element: Element): string {
  const heading = element.parentElement;
  if (heading === null) {
    return '';
  }
  // Neither the element nor another sign with a text of its own, such as an alert's, is the title.
  return [...heading.childNodes]
    .filter((node) => node !== element && !(node instanceof Element && node.querySelector('.tip')))
    .map((node) => node.textContent ?? '')
    .join('')
    .trim();
}
