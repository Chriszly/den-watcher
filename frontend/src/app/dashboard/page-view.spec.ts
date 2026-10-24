import { TestBed } from '@angular/core/testing';

import { OLD_TIMELINE_STORAGE_KEY, PageView, VIEW_STORAGE_KEY } from './page-view';

describe('PageView', () => {
  afterEach(() => {
    localStorage.removeItem(VIEW_STORAGE_KEY);
    localStorage.removeItem(OLD_TIMELINE_STORAGE_KEY);
  });

  it('shows the cards until another view is picked, and remembers the pick', () => {
    expect(TestBed.inject(PageView).view()).toBe('cards');

    TestBed.inject(PageView).pick('timeline');
    expect(localStorage.getItem(VIEW_STORAGE_KEY)).toBe('timeline');

    TestBed.resetTestingModule();
    expect(TestBed.inject(PageView).view()).toBe('timeline');
  });

  it('keeps the timeline the mascot switched on before the view could be picked', () => {
    localStorage.setItem(OLD_TIMELINE_STORAGE_KEY, 'true');
    expect(TestBed.inject(PageView).view()).toBe('timeline');
  });

  it('shows the cards for a view it does not know', () => {
    localStorage.setItem(VIEW_STORAGE_KEY, 'tiles');
    expect(TestBed.inject(PageView).view()).toBe('cards');
  });
});
