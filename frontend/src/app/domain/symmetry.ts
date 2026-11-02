import { Cell } from './shapes';

/** The axes a stroke is mirrored across while drawing. */
export interface Symmetry {
  /** Left and right mirror each other. */
  horizontal: boolean;
  /** Top and bottom mirror each other. */
  vertical: boolean;
}

/** The points of a stroke together with their mirror images. */
export function withSymmetry(
  points: readonly Cell[],
  width: number,
  height: number,
  symmetry: Symmetry,
): Cell[] {
  const horizontal = symmetry.horizontal
    ? points.flatMap<Cell>(([x, y]) => [
        [x, y],
        [width - 1 - x, y],
      ])
    : [...points];
  return symmetry.vertical
    ? horizontal.flatMap<Cell>(([x, y]) => [
        [x, y],
        [x, height - 1 - y],
      ])
    : horizontal;
}
