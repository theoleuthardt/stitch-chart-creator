import {
  cropRect,
  downsample,
  heightForWidth,
  medianCut,
  nearestColor,
  quantize,
} from './image-quantize';

const rgba = (...pixels: [number, number, number, number][]) =>
  new Uint8ClampedArray(pixels.flat());

describe('downsample', () => {
  it('averages the pixels of each target cell', () => {
    const source = rgba([0, 0, 0, 255], [100, 100, 100, 255], [200, 0, 0, 255], [0, 200, 0, 255]);

    const result = downsample(source, 2, 2, 1, 1);

    expect([...result]).toEqual([75, 75, 25, 255]);
  });

  it('does not lose thin details the way nearest neighbour would', () => {
    const pixels: [number, number, number, number][] = [];
    for (let index = 0; index < 16; index++) {
      pixels.push(index % 4 === 1 ? [255, 0, 0, 255] : [255, 255, 255, 255]);
    }

    const result = downsample(rgba(...pixels), 4, 4, 1, 1);

    expect(result[1]).toBeLessThan(255);
  });

  it('keeps the target size', () => {
    const source = new Uint8ClampedArray(4 * 100).fill(255);

    expect(downsample(source, 10, 10, 3, 2)).toHaveLength(4 * 6);
  });

  it('weighs colours by their opacity', () => {
    const source = rgba([255, 0, 0, 255], [0, 255, 0, 0]);

    const result = downsample(source, 2, 1, 1, 1);

    expect(result[0]).toBe(255);
    expect(result[1]).toBe(0);
  });

  it('works when the target is larger than the source', () => {
    const source = rgba([10, 20, 30, 255]);

    expect([...downsample(source, 1, 1, 2, 1)]).toEqual([10, 20, 30, 255, 10, 20, 30, 255]);
  });
});

describe('medianCut', () => {
  it('returns the colours as they are when there are few enough', () => {
    const colors = [
      [255, 0, 0],
      [0, 0, 255],
    ] as const;

    expect(medianCut(colors, 4)).toEqual(
      expect.arrayContaining([
        [255, 0, 0],
        [0, 0, 255],
      ]),
    );
  });

  it('never returns more colours than asked for', () => {
    const colors: [number, number, number][] = [];
    for (let index = 0; index < 256; index++) {
      colors.push([index, 255 - index, (index * 7) % 256]);
    }

    expect(medianCut(colors, 8)).toHaveLength(8);
  });

  it('separates clearly different groups', () => {
    const colors = [
      [250, 0, 0],
      [255, 5, 5],
      [0, 0, 250],
      [5, 5, 255],
    ] as const;

    const palette = medianCut(colors, 2);

    expect(palette.some(([red]) => red > 200)).toBe(true);
    expect(palette.some(([, , blue]) => blue > 200)).toBe(true);
  });

  it('gives a large area its own colour even if it has few shades', () => {
    const colors: [number, number, number][] = [[60, 130, 60]];
    for (let shade = 0; shade < 60; shade++) {
      colors.push([180 + shade, 30, 60]);
    }
    const weights = [100_000, ...new Array<number>(60).fill(10)];

    const palette = medianCut(colors, 3, weights);

    expect(palette).toContainEqual([60, 130, 60]);
  });

  it('averages a box by how often its colours occur', () => {
    const colors = [
      [0, 0, 0],
      [100, 100, 100],
    ] as const;

    expect(medianCut(colors, 1, [3, 1])).toEqual([[25, 25, 25]]);
  });

  it('handles an empty list', () => {
    expect(medianCut([], 4)).toEqual([]);
  });

  it('is deterministic', () => {
    const colors = [
      [1, 2, 3],
      [200, 100, 50],
      [30, 90, 220],
    ] as const;

    expect(medianCut(colors, 2)).toEqual(medianCut(colors, 2));
  });
});

describe('nearestColor', () => {
  it('finds the closest palette entry', () => {
    const palette = [
      [0, 0, 0],
      [255, 255, 255],
    ] as const;

    expect(nearestColor(palette, 200, 210, 220)).toBe(1);
  });
});

describe('quantize', () => {
  it('turns pixels into cells and a palette', () => {
    const pixels = rgba([255, 0, 0, 255], [255, 0, 0, 255], [0, 0, 255, 255], [0, 0, 255, 255]);

    const { cells, palette } = quantize(pixels, 2);

    expect(palette).toHaveLength(2);
    expect(cells).toHaveLength(4);
    expect(cells[0]).toBe(cells[1]);
    expect(cells[2]).toBe(cells[3]);
    expect(cells[0]).not.toBe(cells[2]);
    expect(palette.every((color) => /^#[0-9a-f]{6}$/.test(color))).toBe(true);
  });

  it('numbers the cells from one, so that zero stays empty', () => {
    expect(quantize(rgba([1, 2, 3, 255]), 4).cells[0]).toBe(1);
  });

  it('leaves transparent pixels empty', () => {
    const { cells, palette } = quantize(rgba([0, 0, 0, 0], [9, 9, 9, 255]), 4);

    expect(cells[0]).toBe(0);
    expect(cells[1]).toBe(1);
    expect(palette).toHaveLength(1);
  });

  it('keeps only palette colours that a stitch really uses', () => {
    const pixels: [number, number, number, number][] = [];
    for (let shade = 0; shade < 40; shade++) {
      pixels.push([shade * 6, 255 - shade * 6, shade * 3, 255]);
    }

    const { cells, palette } = quantize(rgba(...pixels), 12);

    const used = new Set(cells);
    expect(used.size).toBe(palette.length);
    expect(Math.max(...cells)).toBe(palette.length);
  });

  it('handles an image without any visible pixel', () => {
    expect(quantize(rgba([0, 0, 0, 0]), 4)).toEqual({ cells: [0], palette: [] });
  });

  it('copes with a photo-sized chart', () => {
    const pixels = new Uint8ClampedArray(4 * 500 * 500);
    for (let index = 0; index < pixels.length; index += 4) {
      pixels[index] = index % 251;
      pixels[index + 1] = index % 241;
      pixels[index + 2] = index % 239;
      pixels[index + 3] = 255;
    }

    expect(quantize(pixels, 32).palette.length).toBeLessThanOrEqual(32);
  });
});

describe('heightForWidth', () => {
  it('keeps the proportions of the image', () => {
    expect(heightForWidth(800, 600, 40, 1)).toBe(30);
  });

  it('accounts for stitches that are not square', () => {
    expect(heightForWidth(800, 600, 40, 0.8)).toBe(38);
  });

  it('never gives less than one row', () => {
    expect(heightForWidth(1000, 1, 10, 1)).toBe(1);
  });
});

describe('cropRect', () => {
  it('turns percentages from the edges into pixels', () => {
    expect(cropRect(200, 100, { left: 10, top: 20, right: 30, bottom: 40 })).toEqual({
      x: 20,
      y: 20,
      width: 120,
      height: 40,
    });
  });

  it('keeps at least one pixel when the edges cross', () => {
    const rect = cropRect(100, 100, { left: 80, top: 0, right: 80, bottom: 0 });

    expect(rect.width).toBe(1);
    expect(rect.x).toBeLessThan(100);
  });
});
