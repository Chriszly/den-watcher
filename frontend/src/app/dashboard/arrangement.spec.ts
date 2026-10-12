import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Arrangement } from './arrangement';
import { EMPTY_LAYOUT, Layout } from './page-layout';

describe('Arrangement', () => {
  let http: HttpTestingController;
  let arrangement: Arrangement;

  const cards = (...ids: string[]) => ids.map((id) => ({ id }));
  const ids = (list: { id: string }[]) => list.map((card) => card.id);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    arrangement = TestBed.inject(Arrangement);
  });

  afterEach(() => http.verify());

  function answer(layout: Partial<Layout>): void {
    http.expectOne('/api/layout').flush({ ...EMPTY_LAYOUT, ...layout });
  }

  /** The layouts sent to the host, each answered, which lets the next one go. */
  function sent(): Layout[] {
    const layouts: Layout[] = [];
    for (;;) {
      const [write] = http.match((r) => r.method === 'PUT' && r.url === '/api/layout');
      if (!write) {
        return layouts;
      }
      layouts.push(write.request.body as Layout);
      write.flush(null, { status: 204, statusText: 'No Content' });
    }
  }

  it('puts the arranged cards first, in their order, and the others after as they came', () => {
    answer({ order: ['gpus', 'cpu'] });
    expect(ids(arrangement.sort(cards('cpu', 'memory', 'gpus', 'extra:wifi')))).toEqual([
      'gpus',
      'cpu',
      'memory',
      'extra:wifi',
    ]);
  });

  it("keeps a moved category's whole order, after the other categories' cards", () => {
    answer({ order: ['disks', 'memory'] });
    arrangement.move(['cpu', 'memory', 'gpus'], 2, 0);
    expect(sent().map((l) => l.order)).toEqual([['disks', 'gpus', 'cpu', 'memory']]);
  });

  it('moves no card past the ends of its category', () => {
    answer({});
    arrangement.move(['cpu', 'memory'], 0, -1);
    arrangement.move(['cpu', 'memory'], 1, 2);
    arrangement.move(['cpu', 'memory'], 1, 1);
    expect(sent()).toEqual([]);
  });

  it('hides a card once and shows it again', () => {
    answer({ hidden: ['fans'] });
    arrangement.hide('cpu');
    arrangement.hide('cpu');
    expect([...arrangement.hidden()]).toEqual(['fans', 'cpu']);
    arrangement.show('fans');
    expect([...arrangement.hidden()]).toEqual(['cpu']);
    // One layout is sent at a time, the newest after the first.
    expect(sent().map((l) => l.hidden)).toEqual([['fans', 'cpu'], ['cpu']]);
  });

  it('resets the order and the hidden cards, keeping the folded categories', () => {
    answer({ folded: ['storage'], order: ['memory'], hidden: ['cpu'] });
    expect(arrangement.arranged()).toBe(true);
    arrangement.reset();
    expect(arrangement.arranged()).toBe(false);
    expect(sent()).toEqual([{ folded: ['storage'], order: [], hidden: [] }]);
  });
});
