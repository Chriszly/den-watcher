import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CardAlert } from './card-alert';
import { CardInfo } from './card-info';

@Component({
  imports: [CardAlert, CardInfo],
  template: `
    <div class="card">
      <h2>
        CPU
        <app-card-alert level="warning" text="CPU is 91 % busy&#10;CPU is throttled" />
        <app-card-info text="How busy the processor is." />
      </h2>
      <p class="outside">91 %</p>
    </div>
  `,
})
class Host {}

describe('CardAlert', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const sign = element.querySelector<HTMLElement>('app-card-alert')!;
    return {
      fixture,
      sign,
      button: sign.querySelector<HTMLButtonElement>('button')!,
      tip: sign.querySelector<HTMLElement>('.tip')!,
      outside: element.querySelector<HTMLElement>('.outside')!,
    };
  }

  it('tells which alerts the card has, one to a line, apart from the title', () => {
    const { sign, button, tip } = render();
    expect(sign.classList).toContain('warning');
    expect(button.getAttribute('aria-label')).toBe('Needs attention');
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(tip.textContent).toBe('CPU is 91 % busy\nCPU is throttled');
    // The heading and the (i) are named by the title alone, without the alerts.
    expect(sign.closest('h2')!.getAttribute('aria-label')).toBe('CPU');
    expect(
      sign.closest('h2')!.querySelector('app-card-info .info')!.getAttribute('aria-label'),
    ).toBe('About CPU');
  });

  it('opens the alerts with a tap, and closes them with a tap elsewhere or Escape', () => {
    const { fixture, button, tip, outside } = render();
    button.click();
    fixture.detectChanges();
    expect(tip.classList).toContain('open');
    expect(button.getAttribute('aria-expanded')).toBe('true');

    outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(tip.classList).not.toContain('open');

    button.click();
    fixture.detectChanges();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(tip.classList).not.toContain('open');
    expect(tip.classList).toContain('dismissed');
  });
});
