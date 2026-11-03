import { Pattern } from '../domain/pattern';
import { StitchSymbol, symbolById, usedSymbols } from '../domain/symbols';
import { exportLayout, ExportLayout, ExportOptions, LEGEND_ROW, usedColors } from './image-layout';

const GRID_MINOR = '#b8b8b8';
const GRID_MAJOR = '#4d4d4d';
const MAJOR_STEP = 10;

/** Renders a chart as an SVG document. Neighbouring stitches of one colour become one rectangle. */
export function renderSvg(pattern: Pattern, options: ExportOptions): string {
  const layout = exportLayout(pattern, options);
  const { width, height } = layout;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif" font-size="12">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
    cells(pattern, options, layout),
    symbols(pattern, options, layout),
    options.gridLines ? grid(pattern, options, layout) : '',
    options.numbers ? numbers(pattern, options, layout) : '',
    options.legend ? legend(pattern, layout) : '',
    '</svg>',
  ].join('');
}

function cells(pattern: Pattern, options: ExportOptions, layout: ExportLayout): string {
  const { cellSize } = options;
  const { cellHeight } = layout;
  const parts: string[] = ['<g class="cells">'];
  for (let y = 0; y < pattern.height; y++) {
    const row = y * pattern.width;
    let x = 0;
    while (x < pattern.width) {
      const value = pattern.cells[row + x] ?? 0;
      let end = x + 1;
      while (end < pattern.width && pattern.cells[row + end] === value) {
        end++;
      }
      const color = value > 0 ? pattern.palette[value - 1] : undefined;
      if (color) {
        const left = layout.chartX + x * cellSize;
        const top = layout.chartY + y * cellHeight;
        parts.push(
          `<rect x="${left}" y="${top}" width="${(end - x) * cellSize}" height="${cellHeight}" fill="${color}"/>`,
        );
      }
      x = end;
    }
  }
  parts.push('</g>');
  return parts.join('');
}

/** One symbol as lines and circles inside a rectangle. */
function symbolShapes(
  symbol: StitchSymbol,
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  const lines = symbol.lines.map(
    ([x1, y1, x2, y2]) =>
      `<line x1="${x + x1 * width}" y1="${y + y1 * height}" x2="${x + x2 * width}" y2="${y + y2 * height}"/>`,
  );
  const circles = symbol.circles.map(
    ([cx, cy, r]) =>
      `<circle cx="${x + cx * width}" cy="${y + cy * height}" r="${r * Math.min(width, height)}"/>`,
  );
  return [...lines, ...circles].join('');
}

function symbols(pattern: Pattern, options: ExportOptions, layout: ExportLayout): string {
  if (!pattern.symbols) {
    return '';
  }
  const { cellSize } = options;
  const parts: string[] = [
    `<g class="symbols" fill="none" stroke="#000000" stroke-width="${Math.max(1, cellSize / 12)}">`,
  ];
  pattern.symbols.forEach((id, index) => {
    const symbol = symbolById(id);
    if (symbol) {
      const x = layout.chartX + (index % pattern.width) * cellSize;
      const y = layout.chartY + Math.floor(index / pattern.width) * layout.cellHeight;
      parts.push(symbolShapes(symbol, x, y, cellSize, layout.cellHeight));
    }
  });
  parts.push('</g>');
  return parts.join('');
}

function grid(pattern: Pattern, options: ExportOptions, layout: ExportLayout): string {
  const { cellSize } = options;
  const { chartX, chartY, cellHeight } = layout;
  const right = chartX + pattern.width * cellSize;
  const bottom = chartY + pattern.height * cellHeight;
  const line = (index: number, x1: number, y1: number, x2: number, y2: number) => {
    const major = index % MAJOR_STEP === 0;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${major ? GRID_MAJOR : GRID_MINOR}" stroke-width="${major ? 2 : 1}"/>`;
  };
  const parts: string[] = [];
  for (let column = 0; column <= pattern.width; column++) {
    const x = chartX + column * cellSize;
    parts.push(line(column, x, chartY, x, bottom));
  }
  for (let row = 0; row <= pattern.height; row++) {
    const y = chartY + row * cellHeight;
    parts.push(line(row, chartX, y, right, y));
  }
  return parts.join('');
}

function numbers(pattern: Pattern, options: ExportOptions, layout: ExportLayout): string {
  const { cellSize } = options;
  const { chartX, chartY } = layout;
  const label = (x: number, y: number, text: number) =>
    `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
  const parts: string[] = [];
  for (let column = MAJOR_STEP; column <= pattern.width; column += MAJOR_STEP) {
    parts.push(label(chartX + (column - 0.5) * cellSize, chartY / 2, column));
  }
  for (let row = MAJOR_STEP; row <= pattern.height; row += MAJOR_STEP) {
    parts.push(label(chartX / 2, chartY + (row - 0.5) * layout.cellHeight, row));
  }
  return parts.join('');
}

function legend(pattern: Pattern, layout: ExportLayout): string {
  const colors = usedColors(pattern);
  const symbolRows = usedSymbols(pattern).map(({ symbol, count }, index) => {
    const y = layout.legendY + 12 + (colors.length + index) * LEGEND_ROW;
    return (
      `<g fill="none" stroke="#000000" stroke-width="1.5">${symbolShapes(symbol, 12, y + 2, 24, 20)}</g>` +
      `<text x="48" y="${y + 12}" dominant-baseline="middle">${symbol.abbreviation}   ${symbol.name}   ${count} stitches</text>`
    );
  });
  return colors
    .map((entry, index) => {
      const y = layout.legendY + 12 + index * LEGEND_ROW;
      return (
        `<rect x="12" y="${y + 2}" width="24" height="20" fill="${entry.color}"/>` +
        `<text x="48" y="${y + 12}" dominant-baseline="middle">${entry.color}   ${entry.count} stitches</text>`
      );
    })
    .concat(symbolRows)
    .join('');
}
