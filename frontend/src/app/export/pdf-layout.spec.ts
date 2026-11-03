import { createPattern } from '../domain/pattern';
import { PAGE_SIZES, pdfLayout } from './pdf-layout';

const a4 = { paper: 'a4', landscape: false } as const;

describe('pdfLayout', () => {
  it('keeps a small chart on one page', () => {
    const layout = pdfLayout(createPattern(20, 20), a4);

    expect(layout.pages).toEqual([{ fromX: 0, toX: 19, fromY: 0, toY: 19 }]);
  });

  it('enlarges a small chart up to a comfortable size', () => {
    expect(pdfLayout(createPattern(5, 5), a4).cellSize).toBeLessThanOrEqual(16);
    expect(pdfLayout(createPattern(5, 5), a4).cellSize).toBeGreaterThan(10);
  });

  it('swaps the sides of the paper in landscape', () => {
    const portrait = pdfLayout(createPattern(1, 1), a4);
    const landscape = pdfLayout(createPattern(1, 1), { paper: 'a4', landscape: true });

    expect(landscape.pageWidth).toBe(portrait.pageHeight);
    expect(landscape.pageHeight).toBe(portrait.pageWidth);
  });

  it('knows letter paper', () => {
    expect(pdfLayout(createPattern(1, 1), { paper: 'letter', landscape: false }).pageWidth).toBe(
      PAGE_SIZES.letter.width,
    );
  });

  it('uses the height of a knitted stitch', () => {
    const layout = pdfLayout(createPattern(200, 300, 'knitting'), a4);

    expect(layout.cellHeight).toBeCloseTo(layout.cellSize * 0.8);
    for (const page of layout.pages) {
      expect(layout.originY + (page.toY - page.fromY + 1) * layout.cellHeight).toBeLessThanOrEqual(
        layout.pageHeight,
      );
    }
  });

  it('splits a large chart over several pages', () => {
    expect(pdfLayout(createPattern(200, 300), a4).pages.length).toBeGreaterThan(1);
  });

  it('fits every page onto the paper', () => {
    const layout = pdfLayout(createPattern(200, 300), a4);

    for (const page of layout.pages) {
      expect(layout.originX + (page.toX - page.fromX + 1) * layout.cellSize).toBeLessThanOrEqual(
        layout.pageWidth,
      );
      expect(layout.originY + (page.toY - page.fromY + 1) * layout.cellHeight).toBeLessThanOrEqual(
        layout.pageHeight,
      );
    }
  });

  it('covers every stitch', () => {
    const pattern = createPattern(137, 211);
    const covered = new Set<number>();

    for (const page of pdfLayout(pattern, a4).pages) {
      for (let y = page.fromY; y <= page.toY; y++) {
        for (let x = page.fromX; x <= page.toX; x++) {
          covered.add(y * pattern.width + x);
        }
      }
    }

    expect(covered.size).toBe(pattern.cells.length);
  });

  it('repeats stitches between neighbouring pages so that the work can be lined up', () => {
    const { pages, overlap } = pdfLayout(createPattern(200, 10), a4);
    const [first, second] = pages;

    expect(overlap).toBeGreaterThan(0);
    expect(second?.fromX).toBe((first?.toX ?? 0) + 1 - overlap);
  });

  it('ends without a page that only holds repeated stitches', () => {
    const { pages, overlap } = pdfLayout(createPattern(200, 10), a4);
    const last = pages.at(-1);

    expect((last?.toX ?? 0) - (last?.fromX ?? 0) + 1).toBeGreaterThan(overlap);
  });
});
