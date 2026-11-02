import { isHexColor } from '../domain/palette';
import { CraftType, Pattern } from '../domain/pattern';

const FORMAT = 'stitch-chart';
const VERSION = 1;
const CRAFT_TYPES: readonly CraftType[] = ['crossStitch', 'knitting', 'crochet', 'pixelArt'];

/** The longest title the backend accepts. */
const MAX_TITLE = 200;

/** Refuses absurd sizes before anything is allocated for them. */
const MAX_CELLS = 100_000_000;

export type ParseResult = { ok: true; pattern: Pattern } | { ok: false; error: string };

/** Writes a chart as a file. Only the chart itself goes in, nothing the server added. */
export function serializePattern(pattern: Pattern): string {
  const { title, craftType, width, height, palette, cells, symbols } = pattern;
  return JSON.stringify({
    format: FORMAT,
    version: VERSION,
    title,
    craftType,
    width,
    height,
    palette,
    cells,
    symbols,
  });
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Reads a chart file. A file comes from anywhere, so every field is checked and only known fields
 * are taken over; a broken file gives a message and no pattern.
 */
export function parsePatternFile(text: string): ParseResult {
  const fail = (error: string): ParseResult => ({ ok: false, error });
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('This is not a chart file.');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return fail('This is not a chart file.');
  }
  const file = data as Record<string, unknown>;
  if (file['format'] !== FORMAT) {
    return fail('This is not a chart file.');
  }
  if (file['version'] !== VERSION) {
    return fail('This file needs a newer version of the app.');
  }

  const { title, craftType, width, height, palette, cells, symbols } = file;
  if (typeof title !== 'string' || !title.trim() || title.length > MAX_TITLE) {
    return fail('The title of this chart is not valid.');
  }
  if (!CRAFT_TYPES.includes(craftType as CraftType)) {
    return fail('The craft of this chart is not known.');
  }
  if (
    !isCount(width) ||
    !isCount(height) ||
    width === 0 ||
    height === 0 ||
    width * height > MAX_CELLS
  ) {
    return fail('The size of this chart is not valid.');
  }
  if (
    !Array.isArray(palette) ||
    !palette.every((color) => typeof color === 'string' && isHexColor(color))
  ) {
    return fail('The colours of this chart are not valid.');
  }
  const colors = palette.length;
  if (
    !Array.isArray(cells) ||
    cells.length !== width * height ||
    !cells.every((cell) => isCount(cell) && cell <= colors)
  ) {
    return fail('The cells of this chart are not valid.');
  }
  if (
    symbols !== undefined &&
    (!Array.isArray(symbols) ||
      symbols.length !== width * height ||
      !symbols.every((symbol) => isCount(symbol)))
  ) {
    return fail('The symbols of this chart are not valid.');
  }

  return {
    ok: true,
    pattern: {
      title: title.trim(),
      craftType: craftType as CraftType,
      width,
      height,
      palette: palette as string[],
      cells: cells as number[],
      ...(symbols ? { symbols: symbols as number[] } : {}),
    },
  };
}
