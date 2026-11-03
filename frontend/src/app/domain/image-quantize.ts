/** A colour as red, green and blue from 0 to 255. */
export type Rgb = readonly [number, number, number];

/** The part of an image that is kept, as percentages cut off each edge. */
export interface Crop {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A pixel below this opacity counts as empty. */
const MIN_OPACITY = 128;

/** Colours closer than this per channel count as one, which keeps photos manageable. */
const COLLECT_STEP = 4;

/**
 * Scales RGBA pixels to a grid by averaging all source pixels of each target cell, weighted by
 * their opacity. Picking one pixel per cell instead would lose thin lines.
 */
export function downsample(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
): Uint8ClampedArray {
  const target = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const fromY = Math.floor((y * sourceHeight) / height);
    const toY = Math.max(fromY + 1, Math.floor(((y + 1) * sourceHeight) / height));
    for (let x = 0; x < width; x++) {
      const fromX = Math.floor((x * sourceWidth) / width);
      const toX = Math.max(fromX + 1, Math.floor(((x + 1) * sourceWidth) / width));
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let count = 0;
      for (let sourceY = fromY; sourceY < toY; sourceY++) {
        for (let sourceX = fromX; sourceX < toX; sourceX++) {
          const index = (sourceY * sourceWidth + sourceX) * 4;
          const opacity = source[index + 3] ?? 0;
          red += (source[index] ?? 0) * opacity;
          green += (source[index + 1] ?? 0) * opacity;
          blue += (source[index + 2] ?? 0) * opacity;
          alpha += opacity;
          count++;
        }
      }
      const cell = (y * width + x) * 4;
      if (alpha > 0) {
        target[cell] = red / alpha;
        target[cell + 1] = green / alpha;
        target[cell + 2] = blue / alpha;
      }
      target[cell + 3] = alpha / count;
    }
  }
  return target;
}

/** A colour with how often it occurs. */
interface Weighted {
  color: Rgb;
  weight: number;
}

/** How wide a box of colours spreads in a channel. */
function spread(box: readonly Weighted[], channel: 0 | 1 | 2): number {
  let low = 255;
  let high = 0;
  for (const { color } of box) {
    low = Math.min(low, color[channel]);
    high = Math.max(high, color[channel]);
  }
  return high - low;
}

function totalWeight(box: readonly Weighted[]): number {
  return box.reduce((sum, entry) => sum + entry.weight, 0);
}

/** How much a box profits from a split: wide boxes that cover many pixels come first. */
function splitPriority(box: readonly Weighted[]): number {
  return Math.max(spread(box, 0), spread(box, 1), spread(box, 2)) * Math.sqrt(totalWeight(box));
}

/** Splits a box along its widest channel where half of its weight lies on each side. */
function split(box: Weighted[]): [Weighted[], Weighted[]] {
  const channel = ([0, 1, 2] as const).reduce((a, b) => (spread(box, b) > spread(box, a) ? b : a));
  box.sort((a, b) => a.color[channel] - b.color[channel]);
  const half = totalWeight(box) / 2;
  let sum = 0;
  let cut = 1;
  for (let index = 0; index < box.length - 1; index++) {
    sum += (box[index] as Weighted).weight;
    cut = index + 1;
    if (sum >= half) {
      break;
    }
  }
  return [box.slice(0, cut), box.slice(cut)];
}

function average(box: readonly Weighted[]): Rgb {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const { color, weight } of box) {
    red += color[0] * weight;
    green += color[1] * weight;
    blue += color[2] * weight;
  }
  const total = totalWeight(box);
  return [Math.round(red / total), Math.round(green / total), Math.round(blue / total)];
}

/**
 * Reduces colours to at most `count` by median cut. Without weights every colour counts once; with
 * them a large area of one colour counts for what it covers.
 */
export function medianCut(
  colors: readonly Rgb[],
  count: number,
  weights?: readonly number[],
): Rgb[] {
  if (colors.length === 0) {
    return [];
  }
  const boxes: Weighted[][] = [
    colors.map((color, index) => ({ color, weight: weights?.[index] ?? 1 })),
  ];
  while (boxes.length < count) {
    const candidates = boxes.filter((box) => splitPriority(box) > 0);
    if (candidates.length === 0) {
      break;
    }
    const best = candidates.reduce((a, b) => (splitPriority(b) > splitPriority(a) ? b : a));
    boxes.splice(boxes.indexOf(best), 1, ...split(best));
  }
  return boxes.map(average);
}

/** The index of the palette entry closest to a colour. */
export function nearestColor(
  palette: readonly Rgb[],
  red: number,
  green: number,
  blue: number,
): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  palette.forEach((color, index) => {
    const distance = (color[0] - red) ** 2 + (color[1] - green) ** 2 + (color[2] - blue) ** 2;
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function toHex([red, green, blue]: Rgb): string {
  const channel = (value: number) => value.toString(16).padStart(2, '0');
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

/** Drops the palette entries no cell ended up with and closes the gaps in the numbering. */
function withoutUnused(
  cells: number[],
  palette: readonly Rgb[],
): { cells: number[]; palette: string[] } {
  const used = [...new Set(cells)].filter((cell) => cell > 0).sort((a, b) => a - b);
  const renumbered = new Map(used.map((cell, index) => [cell, index + 1]));
  return {
    cells: cells.map((cell) => renumbered.get(cell) ?? 0),
    palette: used.map((cell) => toHex(palette[cell - 1] as Rgb)),
  };
}

/** Reduces RGBA pixels to a palette of at most `count` colours and cells numbered from 1. */
export function quantize(
  pixels: Uint8ClampedArray,
  count: number,
): { cells: number[]; palette: string[] } {
  const cellCount = pixels.length / 4;
  const distinct = new Map<number, Weighted>();
  for (let index = 0; index < pixels.length; index += 4) {
    if ((pixels[index + 3] ?? 0) >= MIN_OPACITY) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const key =
        (Math.floor(red / COLLECT_STEP) << 16) |
        (Math.floor(green / COLLECT_STEP) << 8) |
        Math.floor(blue / COLLECT_STEP);
      const entry = distinct.get(key);
      if (entry) {
        entry.weight++;
      } else {
        distinct.set(key, { color: [red, green, blue], weight: 1 });
      }
    }
  }
  const entries = [...distinct.values()];
  const palette = medianCut(
    entries.map((entry) => entry.color),
    count,
    entries.map((entry) => entry.weight),
  );
  const memo = new Map<number, number>();
  const cells = new Array<number>(cellCount).fill(0);
  for (let cell = 0; cell < cellCount; cell++) {
    const index = cell * 4;
    if ((pixels[index + 3] ?? 0) >= MIN_OPACITY) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const key = (red << 16) | (green << 8) | blue;
      let number = memo.get(key);
      if (number === undefined) {
        number = nearestColor(palette, red, green, blue) + 1;
        memo.set(key, number);
      }
      cells[cell] = number;
    }
  }
  return withoutUnused(cells, palette);
}

/** The rows that keep the proportions of an image for a width and the shape of a stitch. */
export function heightForWidth(
  imageWidth: number,
  imageHeight: number,
  width: number,
  aspect: number,
): number {
  return Math.max(1, Math.round(((imageHeight / imageWidth) * width) / aspect));
}

/** Turns the percentages of a crop into a pixel rectangle of at least one pixel. */
export function cropRect(
  imageWidth: number,
  imageHeight: number,
  crop: Crop,
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(imageWidth - 1, Math.round((imageWidth * crop.left) / 100));
  const y = Math.min(imageHeight - 1, Math.round((imageHeight * crop.top) / 100));
  const right = Math.round(imageWidth * (1 - crop.right / 100));
  const bottom = Math.round(imageHeight * (1 - crop.bottom / 100));
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}
