import { Pattern } from '../domain/pattern';
import { cellAspect } from '../domain/symbols';
import { CellRange } from '../domain/viewport';

/** Paper sizes in points. */
export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const;

export type Paper = keyof typeof PAGE_SIZES;

export interface PdfOptions {
  paper: Paper;
  landscape: boolean;
}

/** The arrangement of a chart on the pages of a PDF, in points. */
export interface PdfLayout {
  pageWidth: number;
  pageHeight: number;
  originX: number;
  originY: number;
  cellSize: number;
  cellHeight: number;
  overlap: number;
  pages: CellRange[];
}

const MARGIN = 36;

/** The strip around the chart that holds the numbers. */
const NUMBER_STRIP = 18;

/** The line above the chart with title and page number. */
const HEADER = 16;

/** A stitch on a page of a large chart: about 3.5 mm, large enough to read while stitching. */
const BASE_CELL = 10;

/** A small chart is enlarged up to this size. */
const MAX_CELL = 16;

/** Stitches repeated between neighbouring pages so that the work can be lined up. */
const OVERLAP = 2;

/** Covers `total` cells with stretches of `perPage` cells that overlap. */
function stretches(total: number, perPage: number): [number, number][] {
  const result: [number, number][] = [];
  let from = 0;
  for (;;) {
    const to = Math.min(from + perPage - 1, total - 1);
    result.push([from, to]);
    if (to === total - 1) {
      return result;
    }
    from = to + 1 - OVERLAP;
  }
}

/** Fits a chart on one page when that keeps it readable, and tiles it over pages otherwise. */
export function pdfLayout(pattern: Pattern, options: PdfOptions): PdfLayout {
  const paper = PAGE_SIZES[options.paper];
  const pageWidth = options.landscape ? paper.height : paper.width;
  const pageHeight = options.landscape ? paper.width : paper.height;
  const originX = MARGIN + NUMBER_STRIP;
  const originY = MARGIN + HEADER + NUMBER_STRIP;
  const usableWidth = pageWidth - originX - MARGIN;
  const usableHeight = pageHeight - originY - MARGIN;

  const aspect = cellAspect(pattern.craftType);
  const fit = Math.min(usableWidth / pattern.width, usableHeight / (pattern.height * aspect));
  const cellSize = fit >= BASE_CELL ? Math.min(fit, MAX_CELL) : BASE_CELL;
  const cellHeight = cellSize * aspect;
  const columns = Math.floor(usableWidth / cellSize + 1e-9);
  const rows = Math.floor(usableHeight / cellHeight + 1e-9);

  const pages: CellRange[] = [];
  for (const [fromY, toY] of stretches(pattern.height, rows)) {
    for (const [fromX, toX] of stretches(pattern.width, columns)) {
      pages.push({ fromX, toX, fromY, toY });
    }
  }
  return { pageWidth, pageHeight, originX, originY, cellSize, cellHeight, overlap: OVERLAP, pages };
}
