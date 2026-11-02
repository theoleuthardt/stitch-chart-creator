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

  it('ignores an invalid cell size', () => {
    const panel = setup(10, 10);

    panel.setCellSize(0);
    panel.setCellSize(Number.NaN);

    expect(panel.options().cellSize).toBe(20);
  });
});
