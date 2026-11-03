import type { jsPDF } from 'jspdf';
import { Pattern } from '../domain/pattern';
import { CellRange } from '../domain/viewport';
import { usedColors } from './image-layout';
import { PdfLayout, pdfLayout, PdfOptions } from './pdf-layout';

const MAJOR_STEP = 10;
const MARGIN = 36;
const LEGEND_ROW = 22;

/**
 * Renders a printable chart: the pages of the chart and a legend page. jsPDF is loaded on demand,
 * because most sessions never export a PDF.
 */
export async function renderPdf(pattern: Pattern, options: PdfOptions): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const layout = pdfLayout(pattern, options);
  const doc = new jsPDF({
    unit: 'pt',
    format: [layout.pageWidth, layout.pageHeight],
    orientation: options.landscape ? 'landscape' : 'portrait',
    compress: true,
  });
  layout.pages.forEach((page, index) => {
    if (index > 0) {
      doc.addPage();
    }
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(`${pattern.title} - page ${index + 1} of ${layout.pages.length}`, MARGIN, MARGIN);
    drawCells(doc, pattern, page, layout);
    drawGrid(doc, page, layout);
    drawNumbers(doc, page, layout);
    drawOverlapMarks(doc, page, layout);
  });
  drawLegend(doc, pattern, layout);
  return doc.output('blob');
}

function drawCells(doc: jsPDF, pattern: Pattern, page: CellRange, layout: PdfLayout): void {
  const { originX, originY, cellSize } = layout;
  for (let y = page.fromY; y <= page.toY; y++) {
    const row = y * pattern.width;
    let x = page.fromX;
    while (x <= page.toX) {
      const value = pattern.cells[row + x] ?? 0;
      let end = x + 1;
      while (end <= page.toX && pattern.cells[row + end] === value) {
        end++;
      }
      const color = value > 0 ? pattern.palette[value - 1] : undefined;
      if (color) {
        doc.setFillColor(color);
        doc.rect(
          originX + (x - page.fromX) * cellSize,
          originY + (y - page.fromY) * cellSize,
          (end - x) * cellSize,
          cellSize,
          'F',
        );
      }
      x = end;
    }
  }
}

function drawGrid(doc: jsPDF, page: CellRange, layout: PdfLayout): void {
  const { originX, originY, cellSize } = layout;
  const right = originX + (page.toX - page.fromX + 1) * cellSize;
  const bottom = originY + (page.toY - page.fromY + 1) * cellSize;
  const style = (index: number) => {
    const major = index % MAJOR_STEP === 0;
    doc.setDrawColor(major ? 60 : 180);
    doc.setLineWidth(major ? 0.8 : 0.25);
  };
  for (let column = page.fromX; column <= page.toX + 1; column++) {
    const x = originX + (column - page.fromX) * cellSize;
    style(column);
    doc.line(x, originY, x, bottom);
  }
  for (let row = page.fromY; row <= page.toY + 1; row++) {
    const y = originY + (row - page.fromY) * cellSize;
    style(row);
    doc.line(originX, y, right, y);
  }
}

function drawNumbers(doc: jsPDF, page: CellRange, layout: PdfLayout): void {
  const { originX, originY, cellSize } = layout;
  doc.setFontSize(7);
  const first = (from: number) => Math.ceil((from + 1) / MAJOR_STEP) * MAJOR_STEP;
  for (let column = first(page.fromX); column <= page.toX + 1; column += MAJOR_STEP) {
    const x = originX + (column - 1 - page.fromX + 0.5) * cellSize;
    doc.text(String(column), x, originY - 5, { align: 'center' });
  }
  for (let row = first(page.fromY); row <= page.toY + 1; row += MAJOR_STEP) {
    const y = originY + (row - 1 - page.fromY + 0.5) * cellSize;
    doc.text(String(row), originX - 5, y + 2, { align: 'right' });
  }
}

/** Dashed lines show where the stitches repeated from the previous page end. */
function drawOverlapMarks(doc: jsPDF, page: CellRange, layout: PdfLayout): void {
  const { originX, originY, cellSize, overlap } = layout;
  const right = originX + (page.toX - page.fromX + 1) * cellSize;
  const bottom = originY + (page.toY - page.fromY + 1) * cellSize;
  doc.setDrawColor(200, 30, 30);
  doc.setLineWidth(1);
  doc.setLineDashPattern([3, 2], 0);
  if (page.fromX > 0) {
    const x = originX + overlap * cellSize;
    doc.line(x, originY, x, bottom);
  }
  if (page.fromY > 0) {
    const y = originY + overlap * cellSize;
    doc.line(originX, y, right, y);
  }
  doc.setLineDashPattern([], 0);
}

function drawLegend(doc: jsPDF, pattern: Pattern, layout: PdfLayout): void {
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`${pattern.title} - colours`, MARGIN, MARGIN);
  doc.setFontSize(10);
  let y = MARGIN + 20;
  for (const entry of usedColors(pattern)) {
    if (y + LEGEND_ROW > layout.pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    doc.setFillColor(entry.color);
    doc.setDrawColor(120);
    doc.setLineWidth(0.25);
    doc.rect(MARGIN, y, 24, 16, 'FD');
    doc.text(`${entry.color}   ${entry.count} stitches`, MARGIN + 34, y + 12);
    y += LEGEND_ROW;
  }
}
