import { TestBed } from '@angular/core/testing';
import { CraftType, createPattern } from '../../domain/pattern';
import { EditorStore } from './editor-store';
import { GaugePanel } from './gauge-panel';

describe('GaugePanel', () => {
  const setup = async (craft: CraftType) => {
    TestBed.configureTestingModule({ imports: [GaugePanel], providers: [EditorStore] });
    const store = TestBed.inject(EditorStore);
    store.load(createPattern(140, 70, craft));
    const fixture = TestBed.createComponent(GaugePanel);
    await fixture.whenStable();
    return {
      store,
      fixture,
      panel: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  };

  it('shows the size on fabric for cross stitch', async () => {
    const { element } = await setup('crossStitch');

    expect(element.textContent).toContain('25.4 × 12.7 cm');
    expect(element.textContent).toContain('35.4 × 22.7 cm');
  });

  it('follows the chosen fabric', async () => {
    const { fixture, panel, element } = await setup('crossStitch');

    panel.fabricCount.set(11);
    await fixture.whenStable();

    expect(element.textContent).toContain('32.3 × 16.2 cm');
  });

  it('shows the finished size for knitting', async () => {
    const { element } = await setup('knitting');

    expect(element.textContent).toContain('63.6 × 23.3 cm');
  });

  it('stores a changed gauge with the chart as an undoable step', async () => {
    const { panel, store } = await setup('knitting');

    panel.update({ stitchesPerUnit: 20 });

    expect(store.pattern().gauge).toEqual({ stitchesPerUnit: 20, rowsPerUnit: 30, unit: 'cm10' });
    store.undo();
    expect(store.pattern().gauge).toBeUndefined();
  });

  it('refuses an impossible gauge', async () => {
    const { panel, store } = await setup('knitting');

    panel.update({ rowsPerUnit: 0 });
    panel.update({ stitchesPerUnit: Number.NaN });

    expect(store.pattern().gauge).toBeUndefined();
  });

  it('works out the stitches for a wanted size', async () => {
    const { panel } = await setup('knitting');

    panel.wantedWidth.set(50);
    panel.wantedHeight.set(20);

    expect(panel.required()).toEqual({ stitches: 110, rows: 60 });
  });
});
