export type Cell = readonly [number, number];

/** The cells of a straight line, without gaps (Bresenham), from the start to the end. */
export function linePoints(x0: number, y0: number, x1: number, y1: number): Cell[] {
  const points: Cell[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    points.push([x, y]);
    if (x === x1 && y === y1) {
      return points;
    }
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += stepX;
    }
    if (doubled <= dx) {
      error += dx;
      y += stepY;
    }
  }
}

/** The outline of the rectangle between two corners, every cell once. */
export function rectanglePoints(x0: number, y0: number, x1: number, y1: number): Cell[] {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  const points: Cell[] = [];
  for (let x = left; x <= right; x++) {
    points.push([x, top]);
    if (bottom > top) {
      points.push([x, bottom]);
    }
  }
  for (let y = top + 1; y < bottom; y++) {
    points.push([left, y]);
    if (right > left) {
      points.push([right, y]);
    }
  }
  return points;
}
