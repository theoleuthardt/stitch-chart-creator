import type { StitchSymbol } from './symbols';

/** The crafts a chart can be made for. */
export type CraftType = 'crossStitch' | 'knitting' | 'crochet' | 'pixelArt';

/**
 * A chart. `cells` is a flat array of length `width * height`, row by row; the value `n` refers to
 * `palette[n - 1]` and `0` is empty. `symbols` has the same layout and holds a symbol id per cell.
 * `customStitches` holds a copy of the custom stitches the chart uses, numbered from 1000.
 * A pattern is immutable: every operation returns a new one and shares nothing it changed.
 */
export interface Pattern {
  title: string;
  craftType: CraftType;
  width: number;
  height: number;
  palette: string[];
  cells: number[];
  symbols?: number[];
  customStitches?: StitchSymbol[];
}

/** The colour of a new chart. */
const DEFAULT_COLOR = '#23222a';

/** Creates an empty chart with one colour to draw with. */
export function createPattern(
  width: number,
  height: number,
  craftType: CraftType = 'crossStitch',
  title = 'Untitled',
): Pattern {
  return {
    title,
    craftType,
    width,
    height,
    palette: [DEFAULT_COLOR],
    cells: new Array<number>(width * height).fill(0),
  };
}

export function cellIndex(pattern: Pattern, x: number, y: number): number {
  return y * pattern.width + x;
}

export function inBounds(pattern: Pattern, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < pattern.width && y < pattern.height;
}

export function getCell(pattern: Pattern, x: number, y: number): number | undefined {
  return inBounds(pattern, x, y) ? pattern.cells[cellIndex(pattern, x, y)] : undefined;
}

export function setCell(pattern: Pattern, x: number, y: number, value: number): Pattern {
  return setCells(pattern, [[x, y]], value);
}

/** Writes one value to many cells in a single copy. Points outside the chart are skipped. */
export function setCells(
  pattern: Pattern,
  points: readonly (readonly [number, number])[],
  value: number,
): Pattern {
  let cells: number[] | null = null;
  for (const [x, y] of points) {
    const index = cellIndex(pattern, x, y);
    if (inBounds(pattern, x, y) && pattern.cells[index] !== value) {
      cells ??= [...pattern.cells];
      cells[index] = value;
    }
  }
  return cells ? { ...pattern, cells } : pattern;
}

/** Rebuilds both layers on a new grid; `source` names the old index of each new cell or -1. */
function remap(
  pattern: Pattern,
  width: number,
  height: number,
  source: (x: number, y: number) => number,
): Pattern {
  const copy = (layer: readonly number[]) => {
    const result = new Array<number>(width * height);
    for (let y = 0, target = 0; y < height; y++) {
      for (let x = 0; x < width; x++, target++) {
        const from = source(x, y);
        result[target] = from < 0 ? 0 : (layer[from] ?? 0);
      }
    }
    return result;
  };
  return {
    ...pattern,
    width,
    height,
    cells: copy(pattern.cells),
    ...(pattern.symbols ? { symbols: copy(pattern.symbols) } : {}),
  };
}

/** Changes the size; the content stays anchored at the top left. */
export function resize(pattern: Pattern, width: number, height: number): Pattern {
  return remap(pattern, width, height, (x, y) =>
    inBounds(pattern, x, y) ? cellIndex(pattern, x, y) : -1,
  );
}

/** Fills the area around a cell that has the same value, across edges but not corners. */
export function floodFill(pattern: Pattern, x: number, y: number, value: number): Pattern {
  const target = getCell(pattern, x, y);
  if (target === undefined || target === value) {
    return pattern;
  }
  const { width, height } = pattern;
  const cells = [...pattern.cells];
  const stack = [cellIndex(pattern, x, y)];
  cells[stack[0] as number] = value;
  const visit = (index: number) => {
    if (cells[index] === target) {
      cells[index] = value;
      stack.push(index);
    }
  };
  while (stack.length > 0) {
    const index = stack.pop() as number;
    const column = index % width;
    if (column > 0) visit(index - 1);
    if (column < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < width * (height - 1)) visit(index + width);
  }
  return { ...pattern, cells };
}

export function mirrorHorizontal(pattern: Pattern): Pattern {
  const { width, height } = pattern;
  return remap(pattern, width, height, (x, y) => y * width + (width - 1 - x));
}

export function mirrorVertical(pattern: Pattern): Pattern {
  const { width, height } = pattern;
  return remap(pattern, width, height, (x, y) => (height - 1 - y) * width + x);
}

/** A cell at `(x, y)` moves to `(height - 1 - y, x)`; width and height swap. */
export function rotateClockwise(pattern: Pattern): Pattern {
  const { width, height } = pattern;
  return remap(pattern, height, width, (x, y) => (height - 1 - x) * width + y);
}

/** A cell at `(x, y)` moves to `(y, width - 1 - x)`; width and height swap. */
export function rotateCounterClockwise(pattern: Pattern): Pattern {
  const { width, height } = pattern;
  return remap(pattern, height, width, (x, y) => x * width + (width - 1 - y));
}

/** How many cells use each palette entry, in palette order. */
export function colorUsage(pattern: Pattern): number[] {
  const counts = new Array<number>(pattern.palette.length).fill(0);
  for (const cell of pattern.cells) {
    if (cell > 0) {
      counts[cell - 1] = (counts[cell - 1] ?? 0) + 1;
    }
  }
  return counts;
}
