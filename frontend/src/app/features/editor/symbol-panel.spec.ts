import { TestBed } from '@angular/core/testing';
import { createPattern } from '../../domain/pattern';
import { EditorStore } from './editor-store';
import { SymbolPanel } from './symbol-panel';

describe('SymbolPanel', () => {
  const setup = async (craft: 'knitting' | 'crossStitch') => {
    TestBed.configureTestingModule({ imports: [SymbolPanel], providers: [EditorStore] });
    const store = TestBed.inject(EditorStore);
    store.load(createPattern(2, 2, craft));
    const fixture = TestBed.createComponent(SymbolPanel);
    await fixture.whenStable();
    return { store, element: fixture.nativeElement as HTMLElement };
  };

  it('offers the stitches of the craft', async () => {
    const { element } = await setup('knitting');

    expect(element.textContent).toContain('k2tog');
  });

  it('stays empty for a colour craft', async () => {
    const { element } = await setup('crossStitch');

    expect(element.querySelectorAll('button')).toHaveLength(0);
  });

  it('picking a stitch selects it and the symbol tool', async () => {
    const { element, store } = await setup('knitting');

    element.querySelector<HTMLButtonElement>('[aria-label="Purl"]')?.click();

    expect(store.symbol()).toBe(2);
    expect(store.tool()).toBe('symbol');
  });
});
