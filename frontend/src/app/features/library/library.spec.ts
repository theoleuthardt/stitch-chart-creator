import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PatternApi, PatternPage, PatternSummary, StoredPattern } from '../../api/pattern-api';
import { createPattern } from '../../domain/pattern';
import { Library } from './library';

const summary: PatternSummary = {
  id: 'a',
  title: 'Rose',
  craftType: 'crossStitch',
  width: 20,
  height: 30,
  thumbnail: null,
  updatedAt: '2026-11-02T10:00:00Z',
};

const stored = (): StoredPattern => ({
  ...createPattern(1, 1, 'crossStitch', 'Rose'),
  id: 'a',
  version: 2,
  createdAt: '',
  updatedAt: '',
});

describe('Library', () => {
  const setup = async (items: PatternSummary[] = [summary]) => {
    const page: PatternPage = { items, total: items.length, page: 0, size: 50 };
    const api = {
      list: vi.fn(() => Promise.resolve(page)),
      get: vi.fn(() => Promise.resolve(stored())),
      create: vi.fn(() => Promise.resolve({ ...stored(), id: 'new' })),
      save: vi.fn(() => Promise.resolve(stored())),
      remove: vi.fn(() => Promise.resolve()),
    };
    TestBed.configureTestingModule({
      imports: [Library],
      providers: [provideRouter([]), { provide: PatternApi, useValue: api }],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Library);
    await fixture.whenStable();
    return { fixture, api, navigate, element: fixture.nativeElement as HTMLElement };
  };

  it('lists the charts with title and size', async () => {
    const { element } = await setup();

    expect(element.textContent).toContain('Rose');
    expect(element.textContent).toContain('20 × 30');
  });

  it('invites to start when the library is empty', async () => {
    const { element } = await setup([]);

    expect(element.textContent).toContain('no charts yet');
  });

  it('creates a chart and opens it', async () => {
    const { fixture, api, navigate } = await setup();
    fixture.componentInstance.newChart.setValue({ title: 'Tulip', width: 10, height: 12 });

    await fixture.componentInstance.create();

    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tulip', width: 10, height: 12 }),
    );
    expect(navigate).toHaveBeenCalledWith('/charts/new');
  });

  it('refuses an impossible size', async () => {
    const { fixture, api } = await setup();
    fixture.componentInstance.newChart.setValue({ title: 'Tulip', width: 0, height: 12 });

    await fixture.componentInstance.create();

    expect(api.create).not.toHaveBeenCalled();
  });

  it('duplicates a chart under a new title', async () => {
    const { fixture, api } = await setup();

    await fixture.componentInstance.duplicate(summary);

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rose copy' }));
  });

  it('renames a chart with the version it has', async () => {
    const { fixture, api } = await setup();

    await fixture.componentInstance.rename(summary, 'Red rose');

    expect(api.save).toHaveBeenCalledWith('a', expect.objectContaining({ title: 'Red rose' }), 2);
  });

  it('does not rename to nothing', async () => {
    const { fixture, api } = await setup();

    await fixture.componentInstance.rename(summary, '   ');

    expect(api.save).not.toHaveBeenCalled();
  });

  it('deletes a chart after asking', async () => {
    const { fixture, api } = await setup();

    fixture.componentInstance.confirmDelete.set('a');
    await fixture.componentInstance.remove(summary);

    expect(api.remove).toHaveBeenCalledWith('a');
    expect(fixture.componentInstance.charts()).toEqual([]);
  });
});
