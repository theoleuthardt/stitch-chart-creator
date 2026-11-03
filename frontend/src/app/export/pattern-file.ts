import { Gauge } from '../domain/gauge';
import { isHexColor } from '../domain/palette';
import { CraftType, Pattern } from '../domain/pattern';
import { FIRST_CUSTOM_ID, isStitchAbbreviation, StitchSymbol } from '../domain/symbols';

const FORMAT = 'stitch-chart';
const VERSION = 1;
const CRAFT_TYPES: readonly CraftType[] = ['crossStitch', 'knitting', 'crochet', 'pixelArt'];

/** The longest title the backend accepts. */
const MAX_TITLE = 200;

const GAUGE_UNITS: readonly Gauge['unit'][] = ['cm', 'cm10', 'in', 'in4'];

/** The largest gauge the backend accepts. */
const MAX_GAUGE = 1000;

/** The longest stitch name the backend accepts. */
const MAX_STITCH_NAME = 60;

/** What fits into one request of the backend, which holds about two bytes per stitch. */
const MAX_CELLS = 16_000_000;

/** The longest palette the backend accepts. */
const MAX_PALETTE = 4096;

export type ParseResult = { ok: true; pattern: Pattern } | { ok: false; error: string };

/** Writes a chart as a file. Only the chart itself goes in, nothing the server added. */
export function serializePattern(pattern: Pattern): string {
  const { title, craftType, width, height, palette, cells, symbols, customStitches, gauge } =
    pattern;
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
    customStitches,
    gauge,
  });
}

function isGauge(value: unknown): value is Gauge {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { stitchesPerUnit, rowsPerUnit, unit } = value as Record<string, unknown>;
  const positive = (number: unknown) =>
    typeof number === 'number' && number > 0 && number <= MAX_GAUGE;
  return (
    positive(stitchesPerUnit) &&
    positive(rowsPerUnit) &&
    GAUGE_UNITS.includes(unit as Gauge['unit'])
  );
}

function isShapeList(value: unknown, size: number): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (shape) =>
        Array.isArray(shape) &&
        shape.length === size &&
        shape.every((number) => typeof number === 'number' && number >= 0 && number <= 1),
    )
  );
}

/** Whether a value is a complete stitch with a drawing of plain numbers. */
function isStitch(value: unknown): value is StitchSymbol {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { id, name, abbreviation, lines, circles } = value as Record<string, unknown>;
  return (
    isCount(id) &&
    id >= FIRST_CUSTOM_ID &&
    typeof name === 'string' &&
    name.trim().length > 0 &&
    name.length <= MAX_STITCH_NAME &&
    typeof abbreviation === 'string' &&
    isStitchAbbreviation(abbreviation) &&
    isShapeList(lines, 4) &&
    isShapeList(circles, 3) &&
    (lines as unknown[]).length + (circles as unknown[]).length > 0
  );
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

  const { title, craftType, width, height, palette, cells, symbols, customStitches, gauge } = file;
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
    palette.length > MAX_PALETTE ||
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
    customStitches !== undefined &&
    (!Array.isArray(customStitches) || !customStitches.every(isStitch))
  ) {
    return fail('The stitches of this chart are not valid.');
  }
  const stitchIds = new Set((customStitches ?? []).map((stitch) => stitch.id));
  if (
    symbols !== undefined &&
    (!Array.isArray(symbols) ||
      symbols.length !== width * height ||
      !symbols.every(
        (symbol) => isCount(symbol) && (symbol < FIRST_CUSTOM_ID || stitchIds.has(symbol)),
      ))
  ) {
    return fail('The symbols of this chart are not valid.');
  }

  if (gauge !== undefined && !isGauge(gauge)) {
    return fail('The gauge of this chart is not valid.');
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
      ...(customStitches ? { customStitches } : {}),
      ...(gauge ? { gauge } : {}),
    },
  };
}
