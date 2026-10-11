import { TestBed } from '@angular/core/testing';

import { FOLDED_STORAGE_KEY, FoldedCategories, byCategory, extraCategory } from './categories';

describe('categories', () => {
  afterEach(() => localStorage.removeItem(FOLDED_STORAGE_KEY));

  it('puts the extras the page knows in their category, and the others under other', () => {
    expect(extraCategory('smart-checks')).toBe('storage');
    expect(extraCategory('wifi')).toBe('network');
    expect(extraCategory('containers-memory')).toBe('programs');
    expect(extraCategory('weather')).toBe('other');
    expect(extraCategory('toString')).toBe('other');
  });

  it('groups items in the order of the categories, leaving out empty ones', () => {
    const items = [
      { name: 'time', category: 'device' as const },
      { name: 'cpu', category: 'system' as const },
      { name: 'disks', category: 'storage' as const },
      { name: 'memory', category: 'system' as const },
    ];
    expect(
      byCategory(items, (i) => i.category).map((g) => [g.category, g.items.map((i) => i.name)]),
    ).toEqual([
      ['system', ['cpu', 'memory']],
      ['storage', ['disks']],
      ['device', ['time']],
    ]);
  });

  it('reads the folded categories back, leaving out what is not one', () => {
    localStorage.setItem(FOLDED_STORAGE_KEY, JSON.stringify(['network', 'nonsense', 3]));
    expect([...TestBed.inject(FoldedCategories).folded()]).toEqual(['network']);
  });

  it('starts with none folded when what is kept is not a list', () => {
    localStorage.setItem(FOLDED_STORAGE_KEY, '{not json');
    expect(TestBed.inject(FoldedCategories).folded().size).toBe(0);
  });
});
