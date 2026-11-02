import { Pattern } from './pattern';

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function addColor(pattern: Pattern, color: string): Pattern {
  return { ...pattern, palette: [...pattern.palette, color] };
}

/** Replaces the colour with the 1-based palette number `colorNumber`. */
export function changeColor(pattern: Pattern, colorNumber: number, color: string): Pattern {
  if (pattern.palette[colorNumber - 1] === color) {
    return pattern;
  }
  return {
    ...pattern,
    palette: pattern.palette.map((entry, index) => (index === colorNumber - 1 ? color : entry)),
  };
}

/**
 * Drops a palette entry. Its cells take the colour `replacement`, or become empty with `0`. Both
 * numbers are the ones before the removal; the colours behind the removed one move down one place.
 */
export function removeColor(pattern: Pattern, colorNumber: number, replacement: number): Pattern {
  const renumber = (value: number) => (value > colorNumber ? value - 1 : value);
  return {
    ...pattern,
    palette: pattern.palette.filter((_, index) => index !== colorNumber - 1),
    cells: pattern.cells.map((cell) => renumber(cell === colorNumber ? replacement : cell)),
  };
}

/** Moves the cells of one colour to another one and drops the first. */
export function mergeColors(pattern: Pattern, from: number, into: number): Pattern {
  return from === into ? pattern : removeColor(pattern, from, into);
}
