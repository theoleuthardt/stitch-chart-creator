import { colorUsage, Pattern } from '../domain/pattern';

/** What an exported image shows. */
export interface ExportOptions {
  cellSize: number;
  gridLines: boolean;
  numbers: boolean;
  legend: boolean;
}

/** The arrangement of an exported image in pixels. */
export interface ExportLayout {
  width: number;
  height: number;
  chartX: number;
  chartY: number;
  legendY: number;
  legendRows: number;
}

/** A colour that the chart really uses. */
export interface LegendEntry {
  number: number;
  color: string;
  count: number;
}

/** The strip around the chart that holds the numbers. */
const NUMBER_STRIP = 32;

/** The height of one legend row. */
export const LEGEND_ROW = 28;

/** The space above and below the legend. */
const LEGEND_PADDING = 12;

/** The legend needs this width whatever the size of the chart. */
const LEGEND_WIDTH = 220;

/** The largest canvas side all current browsers can create. */
const MAX_CANVAS_SIDE = 32767;

/** The largest canvas area all current browsers can create. */
const MAX_CANVAS_AREA = 268_435_456;

/** The colours in use, in palette order, with their stitch counts. */
export function usedColors(pattern: Pattern): LegendEntry[] {
  return colorUsage(pattern)
    .map((count, index) => ({
      number: index + 1,
      color: pattern.palette[index] ?? '',
      count,
    }))
    .filter((entry) => entry.count > 0);
}

/** Works out where the parts of an exported image go. */
export function exportLayout(pattern: Pattern, options: ExportOptions): ExportLayout {
  const strip = options.numbers ? NUMBER_STRIP : 0;
  const chartWidth = strip + pattern.width * options.cellSize;
  const chartHeight = strip + pattern.height * options.cellSize;
  const legendRows = options.legend ? usedColors(pattern).length : 0;
  const legendHeight = options.legend ? LEGEND_PADDING * 2 + legendRows * LEGEND_ROW : 0;
  return {
    width: options.legend ? Math.max(chartWidth, LEGEND_WIDTH) : chartWidth,
    height: chartHeight + legendHeight,
    chartX: strip,
    chartY: strip,
    legendY: chartHeight,
    legendRows,
  };
}

/** Whether the browser can create a canvas of this size. */
export function canvasFits(width: number, height: number): boolean {
  return width <= MAX_CANVAS_SIDE && height <= MAX_CANVAS_SIDE && width * height <= MAX_CANVAS_AREA;
}
