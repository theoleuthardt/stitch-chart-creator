import {
  ChartCanvasContext,
  drawCells,
  drawGrid,
  drawSymbols,
  traceSymbol,
} from '../chart/chart-renderer';
import { Pattern } from '../domain/pattern';
import { usedSymbols } from '../domain/symbols';
import { Viewport } from '../domain/viewport';
import { ExportLayout, exportLayout, ExportOptions, LEGEND_ROW, usedColors } from './image-layout';

/** Printed charts are black on white, whatever the theme of the app. */
const INK = '#000000';
const PAPER = '#ffffff';
const GRID_MINOR = '#b8b8b8';
const GRID_MAJOR = '#4d4d4d';

/** The step of the row and column numbers. */
const NUMBER_STEP = 10;

/** Draws the whole image: chart, grid, numbers and legend, with no branding of any kind. */
export function drawExport(
  ctx: ChartCanvasContext,
  pattern: Pattern,
  options: ExportOptions,
  layout: ExportLayout = exportLayout(pattern, options),
): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, layout.width, layout.height);
  const viewport: Viewport = {
    scale: options.cellSize,
    offsetX: layout.chartX,
    offsetY: layout.chartY,
    aspect: layout.cellHeight / options.cellSize,
  };
  const range = { fromX: 0, toX: pattern.width - 1, fromY: 0, toY: pattern.height - 1 };
  drawCells(ctx, pattern, viewport, range);
  drawSymbols(ctx, pattern, viewport, range);
  if (options.gridLines) {
    drawGrid(ctx, viewport, range, GRID_MINOR, GRID_MAJOR);
  }
  ctx.fillStyle = INK;
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'middle';
  if (options.numbers) {
    drawNumbers(ctx, pattern, options, layout);
  }
  if (options.legend) {
    drawLegend(ctx, pattern, layout);
  }
}

function drawNumbers(
  ctx: ChartCanvasContext,
  pattern: Pattern,
  options: ExportOptions,
  layout: ExportLayout,
): void {
  ctx.textAlign = 'center';
  for (let column = NUMBER_STEP; column <= pattern.width; column += NUMBER_STEP) {
    const x = layout.chartX + (column - 0.5) * options.cellSize;
    ctx.fillText(String(column), x, layout.chartY / 2);
  }
  for (let row = NUMBER_STEP; row <= pattern.height; row += NUMBER_STEP) {
    const y = layout.chartY + (row - 0.5) * layout.cellHeight;
    ctx.fillText(String(row), layout.chartX / 2, y);
  }
}

function drawLegend(ctx: ChartCanvasContext, pattern: Pattern, layout: ExportLayout): void {
  ctx.textAlign = 'left';
  const colors = usedColors(pattern);
  colors.forEach((entry, index) => {
    const y = layout.legendY + 12 + index * LEGEND_ROW;
    ctx.fillStyle = entry.color;
    ctx.fillRect(12, y + 2, 24, 24 - 4);
    ctx.fillStyle = INK;
    ctx.fillText(`${entry.color}   ${entry.count} stitches`, 48, y + 12);
  });
  usedSymbols(pattern).forEach(({ symbol, count }, index) => {
    const y = layout.legendY + 12 + (colors.length + index) * LEGEND_ROW;
    ctx.beginPath();
    traceSymbol(ctx, symbol, 12, y + 2, 24, 20);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText(`${symbol.abbreviation}   ${symbol.name}   ${count} stitches`, 48, y + 12);
  });
}

/** Renders the image into a PNG file off-screen, independent of the view on the screen. */
export function renderPng(pattern: Pattern, options: ExportOptions): Promise<Blob> {
  const layout = exportLayout(pattern, options);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext('2d');
  if (!context) {
    return Promise.reject(new Error('The browser cannot draw this image.'));
  }
  drawExport(context, pattern, options, layout);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('The browser cannot create an image of this size.'));
      }
    }, 'image/png');
  });
}
