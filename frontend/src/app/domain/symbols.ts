import { CraftType, inBounds, Pattern } from './pattern';
import { Cell } from './shapes';

/**
 * A stitch symbol, drawn from lines and circles in a unit square. Plain numbers work the same on a
 * canvas, in SVG and in PDF, and they cannot carry markup.
 */
export interface StitchSymbol {
  id: number;
  craft: CraftType;
  name: string;
  abbreviation: string;
  lines: readonly (readonly [number, number, number, number])[];
  circles: readonly (readonly [number, number, number])[];
}

/** The built-in stitches. The ids are stored in charts and must never change. */
export const SYMBOLS: readonly StitchSymbol[] = [
  {
    id: 1,
    craft: 'knitting',
    name: 'Knit',
    abbreviation: 'k',
    lines: [[0.5, 0.2, 0.5, 0.8]],
    circles: [],
  },
  {
    id: 2,
    craft: 'knitting',
    name: 'Purl',
    abbreviation: 'p',
    lines: [[0.2, 0.5, 0.8, 0.5]],
    circles: [],
  },
  {
    id: 3,
    craft: 'knitting',
    name: 'Yarn over',
    abbreviation: 'yo',
    lines: [],
    circles: [[0.5, 0.5, 0.25]],
  },
  {
    id: 4,
    craft: 'knitting',
    name: 'Knit two together',
    abbreviation: 'k2tog',
    lines: [[0.25, 0.8, 0.75, 0.2]],
    circles: [],
  },
  {
    id: 5,
    craft: 'knitting',
    name: 'Slip, slip, knit',
    abbreviation: 'ssk',
    lines: [[0.25, 0.2, 0.75, 0.8]],
    circles: [],
  },
  {
    id: 6,
    craft: 'knitting',
    name: 'Slip',
    abbreviation: 'sl',
    lines: [
      [0.2, 0.25, 0.5, 0.75],
      [0.5, 0.75, 0.8, 0.25],
    ],
    circles: [],
  },
  {
    id: 7,
    craft: 'knitting',
    name: 'Make one',
    abbreviation: 'm1',
    lines: [
      [0.5, 0.2, 0.5, 0.8],
      [0.2, 0.5, 0.8, 0.5],
    ],
    circles: [],
  },
  {
    id: 8,
    craft: 'knitting',
    name: 'Cable',
    abbreviation: 'c',
    lines: [
      [0.15, 0.8, 0.85, 0.2],
      [0.15, 0.2, 0.4, 0.4],
      [0.6, 0.6, 0.85, 0.8],
    ],
    circles: [],
  },
  {
    id: 20,
    craft: 'crochet',
    name: 'Chain',
    abbreviation: 'ch',
    lines: [],
    circles: [[0.5, 0.5, 0.22]],
  },
  {
    id: 21,
    craft: 'crochet',
    name: 'Slip stitch',
    abbreviation: 'sl st',
    lines: [],
    circles: [
      [0.5, 0.5, 0.1],
      [0.5, 0.5, 0.04],
    ],
  },
  {
    id: 22,
    craft: 'crochet',
    name: 'Single crochet',
    abbreviation: 'sc',
    lines: [
      [0.25, 0.25, 0.75, 0.75],
      [0.75, 0.25, 0.25, 0.75],
    ],
    circles: [],
  },
  {
    id: 23,
    craft: 'crochet',
    name: 'Half double crochet',
    abbreviation: 'hdc',
    lines: [
      [0.5, 0.2, 0.5, 0.8],
      [0.25, 0.2, 0.75, 0.2],
    ],
    circles: [],
  },
  {
    id: 24,
    craft: 'crochet',
    name: 'Double crochet',
    abbreviation: 'dc',
    lines: [
      [0.5, 0.2, 0.5, 0.8],
      [0.25, 0.2, 0.75, 0.2],
      [0.35, 0.55, 0.65, 0.4],
    ],
    circles: [],
  },
  {
    id: 25,
    craft: 'crochet',
    name: 'Treble crochet',
    abbreviation: 'tr',
    lines: [
      [0.5, 0.2, 0.5, 0.8],
      [0.25, 0.2, 0.75, 0.2],
      [0.35, 0.45, 0.65, 0.3],
      [0.35, 0.65, 0.65, 0.5],
    ],
    circles: [],
  },
  {
    id: 26,
    craft: 'crochet',
    name: 'Increase',
    abbreviation: 'inc',
    lines: [
      [0.5, 0.8, 0.25, 0.2],
      [0.5, 0.8, 0.75, 0.2],
    ],
    circles: [],
  },
  {
    id: 27,
    craft: 'crochet',
    name: 'Decrease',
    abbreviation: 'dec',
    lines: [
      [0.5, 0.2, 0.25, 0.8],
      [0.5, 0.2, 0.75, 0.8],
    ],
    circles: [],
  },
];

/** The symbols of a craft. Colour crafts have none. */
export function symbolsFor(craft: CraftType): StitchSymbol[] {
  return SYMBOLS.filter((symbol) => symbol.craft === craft);
}

export function symbolById(id: number): StitchSymbol | undefined {
  return SYMBOLS.find((symbol) => symbol.id === id);
}

/** Height of a stitch relative to its width. Knitted stitches are wider than tall. */
export function cellAspect(craft: CraftType): number {
  return craft === 'knitting' ? 0.8 : 1;
}

/** Writes one symbol to many cells in a single copy and creates the layer when it is needed. */
export function setSymbols(pattern: Pattern, points: readonly Cell[], symbol: number): Pattern {
  let symbols: number[] | null = null;
  const current = pattern.symbols;
  for (const [x, y] of points) {
    const index = y * pattern.width + x;
    if (inBounds(pattern, x, y) && (current?.[index] ?? 0) !== symbol) {
      symbols ??= current ? [...current] : new Array<number>(pattern.cells.length).fill(0);
      symbols[index] = symbol;
    }
  }
  return symbols ? { ...pattern, symbols } : pattern;
}

/** The known symbols of a chart with their counts, in library order. */
export function usedSymbols(pattern: Pattern): { symbol: StitchSymbol; count: number }[] {
  const counts = new Map<number, number>();
  for (const id of pattern.symbols ?? []) {
    if (id > 0) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return SYMBOLS.filter((symbol) => counts.has(symbol.id)).map((symbol) => ({
    symbol,
    count: counts.get(symbol.id) ?? 0,
  }));
}

/** Black or white, whichever reads better on a colour. */
export function contrastColor(hex: string): string {
  const channel = (start: number) => parseInt(hex.slice(start, start + 2), 16);
  const luminance = 0.299 * channel(1) + 0.587 * channel(3) + 0.114 * channel(5);
  return luminance > 140 ? '#000000' : '#ffffff';
}
