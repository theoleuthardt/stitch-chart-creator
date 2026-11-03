import { TestBed } from '@angular/core/testing';
import { createPattern } from '../../domain/pattern';
import { EditorStore } from './editor-store';
import { ExportPanel } from './export-panel';

describe('ExportPanel', () => {
  const setup = (width: number, height: number) => {
    TestBed.configureTestingModule({ imports: [ExportPanel], providers: [EditorStore] });
    TestBed.inject(EditorStore).load(createPattern(width, height));
    return TestBed.createComponent(ExportPanel).componentInstance;
  };

  it('shows the size of the image', () => {
    const panel = setup(10, 10);
    panel.set('numbers', false);
    panel.set('legend', false);

    expect(panel.size()).toMatchObject({ width: 200, height: 200 });
  });

  it('warns when the image would exceed what a browser can draw', () => {
    const panel = setup(500, 500);
    expect(panel.fits()).toBe(true);

    panel.setCellSize(200);

    expect(panel.fits()).toBe(false);
  });

  it('tells how many pages a PDF gets', () => {
    expect(setup(200, 300).pdfPages()).toBeGreaterThan(1);
  });

  it('counts the pages for the chosen paper', () => {
    const panel = setup(100, 40);
    const portrait = panel.pdfPages();

    panel.setLandscape(true);

    expect(panel.pdfPages()).toBeLessThan(portrait);
  });

  it('explains when a chart does not fit on a worksheet', async () => {
    const panel = setup(20_000, 1);

    await panel.exportXlsx();

    expect(panel.error()).toBe('This chart is larger than an Excel worksheet.');
  });

  it('counts the pages for the chosen paper size', () => {
    const panel = setup(50, 72);
    const a4 = panel.pdfPages();

    panel.setPaper('letter');

    expect(panel.pdf().paper).toBe('letter');
    expect(panel.pdfPages()).toBeGreaterThan(a4);
  });

  it('ignores an invalid cell size', () => {
    const panel = setup(10, 10);

    panel.setCellSize(0);
    panel.setCellSize(Number.NaN);
    panel.setCellSize(201);

    expect(panel.options().cellSize).toBe(20);
  });
});
