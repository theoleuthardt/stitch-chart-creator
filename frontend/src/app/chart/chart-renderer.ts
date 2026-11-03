import { Pattern } from '../domain/pattern';
import { contrastColor, StitchSymbol, symbolById } from '../domain/symbols';
import { CellRange, cellHeight, Viewport, visibleRange } from '../domain/viewport';

/** The part of a 2D canvas context the renderer uses. */
export type ChartCanvasContext = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'fillRect'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'stroke'
  | 'fillText'
  | 'save'
  | 'restore'
  | 'rect'
  | 'clip'
  | 'arc'
>;

/** The colours around the user's chart colours. */
export interface ChartTheme {
  paper: string;
  gridMinor: string;
  gridMajor: string;
  label: string;
  gutter: string;
}

/** Below this scale the lines between single cells would only be noise. */
const MIN_GRID_SCALE = 4;

/** Below this scale the numbers would overlap. */
const MIN_LABEL_SCALE = 3;

/** Below this scale symbols cannot be told apart. */
const MIN_SYMBOL_SCALE = 6;

/** Width of the strips that hold the row and column numbers. */
export const GUTTER = 24;

const MAJOR_STEP = 10;

/** Heavy lines closer together than this would hide the chart they structure. */
const MIN_MAJOR_SPACING = 30;

/**
 * Draws a chart. Only visible cells are drawn, and neighbouring cells of one colour become one
 * rectangle. With a region, drawing is clipped to those cells: that is the redraw while painting.
 */
export function drawChart(
  ctx: ChartCanvasContext,
  pattern: Pattern,
  viewport: Viewport,
  size: { width: number; height: number },
  theme: ChartTheme,
  region?: CellRange,
): void {
  const visible = visibleRange(viewport, size.width, size.height, pattern.width, pattern.height);
  const range = region ? intersect(visible, region) : visible;
  if (range.toX < range.fromX || range.toY < range.fromY) {
    if (!region) {
      drawGutters(ctx, pattern, viewport, size, theme);
    }
    return;
  }
  const { scale, offsetX, offsetY } = viewport;
  const rowHeight = cellHeight(viewport);
  const left = offsetX + range.fromX * scale;
  const top = offsetY + range.fromY * rowHeight;
  const width = (range.toX - range.fromX + 1) * scale;
  const height = (range.toY - range.fromY + 1) * rowHeight;

  ctx.save();
  if (region) {
    const clipLeft = Math.max(left, GUTTER);
    const clipTop = Math.max(top, GUTTER);
    const clipWidth = left + width - clipLeft;
    const clipHeight = top + height - clipTop;
    if (clipWidth <= 0 || clipHeight <= 0) {
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.rect(clipLeft, clipTop, clipWidth, clipHeight);
    ctx.clip();
  }
  ctx.fillStyle = theme.paper;
  ctx.fillRect(left, top, width, height);
  drawCells(ctx, pattern, viewport, range);
  drawSymbols(ctx, pattern, viewport, range);
  drawGrid(ctx, viewport, range, theme.gridMinor, theme.gridMajor);
  ctx.restore();

  if (!region) {
    drawGutters(ctx, pattern, viewport, size, theme);
  }
}

function intersect(a: CellRange, b: CellRange): CellRange {
  return {
    fromX: Math.max(a.fromX, b.fromX),
    toX: Math.min(a.toX, b.toX),
    fromY: Math.max(a.fromY, b.fromY),
    toY: Math.min(a.toY, b.toY),
  };
}

/** Draws the cells of a range; neighbours of one colour become one rectangle. */
export function drawCells(
  ctx: ChartCanvasContext,
  pattern: Pattern,
  viewport: Viewport,
  range: CellRange,
): void {
  const { scale, offsetX, offsetY } = viewport;
  const rowHeight = cellHeight(viewport);
  for (let y = range.fromY; y <= range.toY; y++) {
    const row = y * pattern.width;
    let x = range.fromX;
    while (x <= range.toX) {
      const value = pattern.cells[row + x] ?? 0;
      let end = x + 1;
      while (end <= range.toX && pattern.cells[row + end] === value) {
        end++;
      }
      const color = value > 0 ? pattern.palette[value - 1] : undefined;
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + x * scale, offsetY + y * rowHeight, (end - x) * scale, rowHeight);
      }
      x = end;
    }
  }
}

/** Adds one symbol to the current path, inside the given rectangle. */
export function traceSymbol(
  ctx: ChartCanvasContext,
  symbol: StitchSymbol,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  for (const [x1, y1, x2, y2] of symbol.lines) {
    ctx.moveTo(x + x1 * width, y + y1 * height);
    ctx.lineTo(x + x2 * width, y + y2 * height);
  }
  for (const [cx, cy, radius] of symbol.circles) {
    const r = radius * Math.min(width, height);
    ctx.moveTo(x + cx * width + r, y + cy * height);
    ctx.arc(x + cx * width, y + cy * height, r, 0, Math.PI * 2);
  }
}

/** Draws the symbols of a range, dark on light cells and light on dark ones. */
export function drawSymbols(
  ctx: ChartCanvasContext,
  pattern: Pattern,
  viewport: Viewport,
  range: CellRange,
): void {
  const { symbols } = pattern;
  const { scale, offsetX, offsetY } = viewport;
  if (!symbols || scale < MIN_SYMBOL_SCALE) {
    return;
  }
  const rowHeight = cellHeight(viewport);
  for (const ink of ['#000000', '#ffffff']) {
    ctx.beginPath();
    for (let y = range.fromY; y <= range.toY; y++) {
      for (let x = range.fromX; x <= range.toX; x++) {
        const index = y * pattern.width + x;
        const symbol = symbolById(symbols[index] ?? 0);
        const color = pattern.palette[(pattern.cells[index] ?? 0) - 1];
        if (symbol && (color ? contrastColor(color) : '#000000') === ink) {
          traceSymbol(ctx, symbol, offsetX + x * scale, offsetY + y * rowHeight, scale, rowHeight);
        }
      }
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, scale / 12);
    ctx.stroke();
  }
}

/** Draws the lines of a range, leaving out what the scale would turn into noise. */
export function drawGrid(
  ctx: ChartCanvasContext,
  viewport: Viewport,
  range: CellRange,
  minor: string,
  major: string,
): void {
  const { scale, offsetX, offsetY } = viewport;
  const rowHeight = cellHeight(viewport);
  const lines = (style: string, lineWidth: number, step: number) => {
    ctx.beginPath();
    const fromX = Math.ceil(range.fromX / step) * step;
    for (let x = fromX; x <= range.toX + 1; x += step) {
      ctx.moveTo(offsetX + x * scale, offsetY + range.fromY * rowHeight);
      ctx.lineTo(offsetX + x * scale, offsetY + (range.toY + 1) * rowHeight);
    }
    const fromY = Math.ceil(range.fromY / step) * step;
    for (let y = fromY; y <= range.toY + 1; y += step) {
      ctx.moveTo(offsetX + range.fromX * scale, offsetY + y * rowHeight);
      ctx.lineTo(offsetX + (range.toX + 1) * scale, offsetY + y * rowHeight);
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };
  if (scale >= MIN_GRID_SCALE) {
    lines(minor, 1, 1);
  }
  if (scale * MAJOR_STEP >= MIN_MAJOR_SPACING) {
    lines(major, 2, MAJOR_STEP);
  }
}

/** The number strips stay on the window edges while the chart moves beneath them. */
function drawGutters(
  ctx: ChartCanvasContext,
  pattern: Pattern,
  viewport: Viewport,
  size: { width: number; height: number },
  theme: ChartTheme,
): void {
  const { scale, offsetX, offsetY } = viewport;
  ctx.fillStyle = theme.gutter;
  ctx.fillRect(0, 0, size.width, GUTTER);
  ctx.fillRect(0, 0, GUTTER, size.height);
  if (scale < MIN_LABEL_SCALE) {
    return;
  }
  ctx.fillStyle = theme.label;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let column = MAJOR_STEP; column <= pattern.width; column += MAJOR_STEP) {
    const x = offsetX + (column - 0.5) * scale;
    if (x > GUTTER && x < size.width) {
      ctx.fillText(String(column), x, GUTTER / 2);
    }
  }
  for (let row = MAJOR_STEP; row <= pattern.height; row += MAJOR_STEP) {
    const y = offsetY + (row - 0.5) * cellHeight(viewport);
    if (y > GUTTER && y < size.height) {
      ctx.fillText(String(row), GUTTER / 2, y);
    }
  }
}

/** What has to be redrawn between two states: cells, everything, or nothing at all. */
export function changedRegion(before: Pattern, after: Pattern): CellRange | 'all' | null {
  if (
    before.width !== after.width ||
    before.height !== after.height ||
    before.palette.length !== after.palette.length ||
    before.palette.some((color, index) => color !== after.palette[index])
  ) {
    return 'all';
  }
  let region: CellRange | null = null;
  const { width } = after;
  for (let index = 0; index < after.cells.length; index++) {
    if (
      before.cells[index] !== after.cells[index] ||
      (before.symbols?.[index] ?? 0) !== (after.symbols?.[index] ?? 0)
    ) {
      const x = index % width;
      const y = Math.floor(index / width);
      region = region
        ? {
            fromX: Math.min(region.fromX, x),
            toX: Math.max(region.toX, x),
            fromY: Math.min(region.fromY, y),
            toY: Math.max(region.toY, y),
          }
        : { fromX: x, toX: x, fromY: y, toY: y };
    }
  }
  return region;
}
