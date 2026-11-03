import { TestBed } from '@angular/core/testing';
import { createPattern } from '../../domain/pattern';
import { CheckPanel } from './check-panel';
import { EditorStore } from './editor-store';

describe('CheckPanel', () => {
  const setup = (cells: number[], width = 3) => {
    TestBed.configureTestingModule({ imports: [CheckPanel], providers: [EditorStore] });
    TestBed.inject(EditorStore).load({
      ...createPattern(width, cells.length / width),
      palette: ['#ff0000', '#0000ff'],
      cells,
    });
    const fixture = TestBed.createComponent(CheckPanel);
    return {
      fixture,
      panel: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  };

  it('finds nothing until it is asked', async () => {
    const { panel } = setup([1, 2, 1]);

    expect(panel.findings()).toBeNull();
  });

  it('lists the findings as sentences', async () => {
    const { fixture, panel, element } = setup([1, 1, 2, 1, 1, 1], 3);

    panel.run();
    await fixture.whenStable();

    expect(element.textContent).toContain('Single stitch in row 1, column 3');
  });

  it('says so when a chart is clean', async () => {
    const { fixture, panel, element } = setup([1, 1, 2, 2], 2);

    panel.run();
    await fixture.whenStable();

    expect(element.textContent).toContain('No problems found');
  });

  it('reports a chosen finding with its place', () => {
    const { panel } = setup([1, 1, 2, 1, 1, 1], 3);
    const chosen: unknown[] = [];
    panel.jump.subscribe((place) => chosen.push(place));

    panel.run();
    const finding = panel.findings()?.[0];
    if (finding) {
      panel.select(finding);
    }

    expect(chosen).toEqual([{ x: 2, y: 0 }]);
  });

  it('jumps to a whole row', () => {
    TestBed.configureTestingModule({ imports: [CheckPanel], providers: [EditorStore] });
    const panel = TestBed.createComponent(CheckPanel).componentInstance;
    const chosen: unknown[] = [];
    panel.jump.subscribe((place) => chosen.push(place));

    panel.select({ kind: 'unevenRow', y: 3, count: 1, expected: 2 });

    expect(chosen).toEqual([{ y: 3 }]);
  });

  it('forgets its findings when the chart changes', async () => {
    const { fixture, panel, element } = setup([1, 1, 2, 1, 1, 1], 3);
    panel.run();
    await fixture.whenStable();

    const store = TestBed.inject(EditorStore);
    store.apply({ ...store.pattern(), title: 'Changed' });
    await fixture.whenStable();

    expect(panel.findings()).toBeNull();
    expect(element.querySelectorAll('li')).toHaveLength(0);
  });

  it('caps a very long list and says how many were left out', async () => {
    const cells = new Array<number>(1000).fill(0).map((_, index) => (index % 2 ? 1 : 2));
    const { fixture, panel, element } = setup(cells, 1000);

    panel.run();
    await fixture.whenStable();

    expect(element.querySelectorAll('li').length).toBeLessThanOrEqual(100);
    expect(element.textContent).toContain('more');
  });
});
