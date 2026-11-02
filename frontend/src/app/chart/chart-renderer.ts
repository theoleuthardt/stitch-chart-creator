import { Pattern } from '../domain/pattern';
import { CellRange, Viewport, visibleRange } from '../domain/viewport';

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
  const left = offsetX + range.fromX * scale;
  const top = offsetY + range.fromY * scale;
  const width = (range.toX - range.fromX + 1) * scale;
  const height = (range.toY - range.fromY + 1) * scale;

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
  drawGrid(ctx, viewport, range, theme);
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

function drawCells(
  ctx: ChartCanvasContext,
  pattern: Pattern,
  viewport: Viewport,
  range: CellRange,
): void {
  const { scale, offsetX, offsetY } = viewport;
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
        ctx.fillRect(offsetX + x * scale, offsetY + y * scale, (end - x) * scale, scale);
      }
      x = end;
    }
  }
}

function drawGrid(
  ctx: ChartCanvasContext,
  viewport: Viewport,
  range: CellRange,
  theme: ChartTheme,
): void {
  const { scale, offsetX, offsetY } = viewport;
  const lines = (style: string, lineWidth: number, step: number) => {
    ctx.beginPath();
    const fromX = Math.ceil(range.fromX / step) * step;
    for (let x = fromX; x <= range.toX + 1; x += step) {
      ctx.moveTo(offsetX + x * scale, offsetY + range.fromY * scale);
      ctx.lineTo(offsetX + x * scale, offsetY + (range.toY + 1) * scale);
    }
    const fromY = Math.ceil(range.fromY / step) * step;
    for (let y = fromY; y <= range.toY + 1; y += step) {
      ctx.moveTo(offsetX + range.fromX * scale, offsetY + y * scale);
      ctx.lineTo(offsetX + (range.toX + 1) * scale, offsetY + y * scale);
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };
  if (scale >= MIN_GRID_SCALE) {
    lines(theme.gridMinor, 1, 1);
  }
  if (scale * MAJOR_STEP >= MIN_MAJOR_SPACING) {
    lines(theme.gridMajor, 2, MAJOR_STEP);
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
    const y = offsetY + (row - 0.5) * scale;
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
    if (before.cells[index] !== after.cells[index]) {
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
