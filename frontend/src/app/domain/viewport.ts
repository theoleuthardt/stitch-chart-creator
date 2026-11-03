/**
 * How the chart lies in the window: pixels per cell and the position of its top left corner. `scale`
 * is the width of a cell; a cell is `aspect` times as high as it is wide, 1 when left out.
 */
export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
  aspect?: number;
}

/** The height of a cell in pixels. */
export function cellHeight(viewport: Viewport): number {
  return viewport.scale * (viewport.aspect ?? 1);
}

/** A range of cells, both ends included. */
export interface CellRange {
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
}

export type Point = readonly [number, number];

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 128;

/** Fitting a chart to the window stops at this scale, so tiny charts do not look absurd. */
const MAX_FIT_SCALE = 48;

/** The cell under a window position. Positions outside the chart give cells outside it. */
export function cellAt(viewport: Viewport, x: number, y: number): [number, number] {
  return [
    Math.floor((x - viewport.offsetX) / viewport.scale),
    Math.floor((y - viewport.offsetY) / cellHeight(viewport)),
  ];
}

/** Zooms around a window position, which stays over the same point of the chart. */
export function zoomAt(viewport: Viewport, factor: number, x: number, y: number): Viewport {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * factor));
  const applied = scale / viewport.scale;
  return {
    ...viewport,
    scale,
    offsetX: x - (x - viewport.offsetX) * applied,
    offsetY: y - (y - viewport.offsetY) * applied,
  };
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, offsetX: viewport.offsetX + dx, offsetY: viewport.offsetY + dy };
}

/** Follows two fingers: their distance zooms, their middle pans. On one spot they only pan. */
export function pinch(
  viewport: Viewport,
  fromA: Point,
  fromB: Point,
  toA: Point,
  toB: Point,
): Viewport {
  const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const middle = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = middle(fromA, fromB);
  const after = middle(toA, toB);
  const panned = panBy(viewport, after[0] - start[0], after[1] - start[1]);
  const spread = distance(fromA, fromB);
  return spread === 0 ? panned : zoomAt(panned, distance(toA, toB) / spread, after[0], after[1]);
}

/** Shows the whole chart centred in the window, with a margin on every side. */
export function fitToWindow(
  chartWidth: number,
  chartHeight: number,
  windowWidth: number,
  windowHeight: number,
  margin: number,
  aspect = 1,
): Viewport {
  const scale = Math.max(
    MIN_SCALE,
    Math.min(
      MAX_FIT_SCALE,
      (windowWidth - margin * 2) / chartWidth,
      (windowHeight - margin * 2) / (chartHeight * aspect),
    ),
  );
  return {
    scale,
    aspect,
    offsetX: (windowWidth - chartWidth * scale) / 2,
    offsetY: (windowHeight - chartHeight * scale * aspect) / 2,
  };
}

/** The cells a window shows. `toX` or `toY` lies below `fromX` or `fromY` if it shows none. */
export function visibleRange(
  viewport: Viewport,
  windowWidth: number,
  windowHeight: number,
  chartWidth: number,
  chartHeight: number,
): CellRange {
  const [left, top] = cellAt(viewport, 0, 0);
  const [right, bottom] = cellAt(viewport, windowWidth - 1, windowHeight - 1);
  return {
    fromX: Math.max(0, left),
    toX: Math.min(chartWidth - 1, right),
    fromY: Math.max(0, top),
    toY: Math.min(chartHeight - 1, bottom),
  };
}
