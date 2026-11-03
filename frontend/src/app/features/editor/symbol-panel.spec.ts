import { TestBed } from '@angular/core/testing';
import { AccountStitch, StitchApi } from '../../api/stitch-api';
import { createPattern } from '../../domain/pattern';
import { StitchDrawing } from '../../domain/symbols';
import { EditorStore } from './editor-store';
import { SymbolPanel } from './symbol-panel';

const bobble: StitchDrawing = {
  name: 'Bobble',
  abbreviation: 'bo',
  lines: [[0, 0, 1, 1]],
  circles: [],
};
const stitches: AccountStitch[] = [{ ...bobble, id: 's1' }];

describe('SymbolPanel', () => {
  const setup = async (craft: 'knitting' | 'crossStitch') => {
    const api = {
      list: vi.fn(() => Promise.resolve(stitches)),
      create: vi.fn((drawing: StitchDrawing) => Promise.resolve({ ...drawing, id: 'new' })),
      remove: vi.fn(() => Promise.resolve()),
    };
    TestBed.configureTestingModule({
      imports: [SymbolPanel],
      providers: [EditorStore, { provide: StitchApi, useValue: api }],
    });
    const store = TestBed.inject(EditorStore);
    store.load(createPattern(2, 2, craft));
    const fixture = TestBed.createComponent(SymbolPanel);
    await fixture.whenStable();
    return { store, api, fixture, element: fixture.nativeElement as HTMLElement };
  };

  it('offers the stitches of the account too', async () => {
    const { element } = await setup('knitting');

    expect(element.querySelector('[aria-label="Bobble"]')).not.toBeNull();
  });

  it('embeds an account stitch in the chart when it is picked', async () => {
    const { element, store } = await setup('knitting');

    element.querySelector<HTMLButtonElement>('[aria-label="Bobble"]')?.click();

    expect(store.pattern().customStitches?.[0]?.name).toBe('Bobble');
    expect(store.symbol()).toBe(1000);
    expect(store.tool()).toBe('symbol');
  });

  it('stores a new stitch in the account and offers it', async () => {
    const { fixture, api } = await setup('knitting');

    await fixture.componentInstance.saveStitch({ ...bobble, name: 'Popcorn' });

    expect(api.create).toHaveBeenCalled();
    expect(fixture.componentInstance.stitches().map((stitch) => stitch.name)).toContain('Popcorn');
  });

  it('removes a stitch from the account and leaves the chart alone', async () => {
    const { element, fixture, store, api } = await setup('knitting');
    element.querySelector<HTMLButtonElement>('[aria-label="Bobble"]')?.click();

    await fixture.componentInstance.removeStitch(
      fixture.componentInstance.stitches()[0] as AccountStitch,
    );

    expect(api.remove).toHaveBeenCalledWith('s1');
    expect(fixture.componentInstance.stitches()).toEqual([]);
    expect(store.pattern().customStitches).toHaveLength(1);
  });

  it('offers the stitches of the craft', async () => {
    const { element } = await setup('knitting');

    expect(element.textContent).toContain('k2tog');
  });

  it('has no built-in stitches for a colour craft', async () => {
    const { element } = await setup('crossStitch');

    expect(element.textContent).not.toContain('k2tog');
  });

  it('picking a stitch selects it and the symbol tool', async () => {
    const { element, store } = await setup('knitting');

    element.querySelector<HTMLButtonElement>('[aria-label="Purl"]')?.click();

    expect(store.symbol()).toBe(2);
    expect(store.tool()).toBe('symbol');
  });
});
