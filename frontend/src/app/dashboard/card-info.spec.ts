import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CardInfo, headingTitle } from './card-info';

@Component({
  imports: [CardInfo],
  template: `
    <div class="card">
      <h2>CPU <app-card-info text="How busy the processor is." /></h2>
      <p class="outside">12 %</p>
    </div>
  `,
})
class Host {}

describe('CardInfo', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      button: element.querySelector<HTMLButtonElement>('.info')!,
      tip: element.querySelector<HTMLElement>('.tip')!,
      outside: element.querySelector<HTMLElement>('.outside')!,
    };
  }

  it('names the button and describes it with the text, for screen readers', () => {
    const { button, tip } = render();
    expect(button.getAttribute('aria-label')).toBe('About CPU');
    // The heading keeps its title as its name, without the button's.
    expect(button.closest('h2')!.getAttribute('aria-label')).toBe('CPU');
    expect(tip.getAttribute('aria-hidden')).toBe('true');
    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.textContent).toBe('How busy the processor is.');
  });

  it('opens the text with a tap and closes it with the next one', () => {
    const { fixture, button, tip } = render();
    expect(tip.classList).not.toContain('open');

    button.click();
    fixture.detectChanges();
    expect(tip.classList).toContain('open');
    expect(button.getAttribute('aria-expanded')).toBe('true');

    button.click();
    fixture.detectChanges();
    expect(tip.classList).not.toContain('open');
  });

  it('closes the text with a tap elsewhere or Escape', () => {
    const { fixture, button, tip, outside } = render();
    button.click();
    fixture.detectChanges();

    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(tip.classList).toContain('open');

    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(tip.classList).not.toContain('open');

    button.click();
    fixture.detectChanges();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(tip.classList).not.toContain('open');
  });

  it('hides with Escape the text that hover or the focus shows, until they leave', () => {
    const { fixture, button, tip } = render();
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(tip.classList).toContain('dismissed');

    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();
    expect(tip.classList).not.toContain('dismissed');

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    button.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(tip.classList).toContain('dismissed');
    button.closest('app-card-info')!.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(tip.classList).not.toContain('dismissed');

    // A tap after Escape opens it again.
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    button.click();
    fixture.detectChanges();
    expect(tip.classList).toContain('open');
    expect(tip.classList).not.toContain('dismissed');
  });
});

describe('headingTitle', () => {
  it('reads the heading without the element in it', () => {
    const heading = document.createElement('h2');
    heading.append('  Disks ');
    const info = document.createElement('app-card-info');
    info.textContent = 'About Disks';
    heading.append(info);
    expect(headingTitle(info)).toBe('Disks');
    expect(headingTitle(document.createElement('span'))).toBe('');
  });
});
