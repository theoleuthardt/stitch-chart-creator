import { Pattern } from '../domain/pattern';

/** The longer side of a thumbnail in pixels. */
const THUMBNAIL_SIZE = 96;

/** Renders a small PNG of a chart for the library, as a data URL. */
export function renderThumbnail(pattern: Pattern): string | undefined {
  const scale = Math.min(THUMBNAIL_SIZE / pattern.width, THUMBNAIL_SIZE / pattern.height);
  const width = Math.max(1, Math.round(pattern.width * scale));
  const height = Math.max(1, Math.round(pattern.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }
  const image = context.createImageData(width, height);
  const colors = pattern.palette.map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);
  for (let y = 0, target = 0; y < height; y++) {
    const row = Math.floor((y * pattern.height) / height) * pattern.width;
    for (let x = 0; x < width; x++, target += 4) {
      const value = pattern.cells[row + Math.floor((x * pattern.width) / width)] ?? 0;
      const [red = 255, green = 255, blue = 255] = colors[value - 1] ?? [];
      image.data[target] = red;
      image.data[target + 1] = green;
      image.data[target + 2] = blue;
      image.data[target + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}
