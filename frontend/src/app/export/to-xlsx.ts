import type { Cell, Sheet } from 'write-excel-file/browser';
import { Pattern } from '../domain/pattern';
import { cellAspect, symbolFor, usedSymbols } from '../domain/symbols';
import { usedColors } from './image-layout';

/** The columns of a worksheet. */
const MAX_COLUMNS = 16_384;

/** The rows of a worksheet. */
const MAX_ROWS = 1_048_576;

/** The width of a column in characters; together with the row height it makes square cells. */
const CELL_WIDTH = 2.5;

/** The height of a row in points. */
const CELL_HEIGHT = 15;

/** Whether a chart fits on a worksheet. */
export function fitsExcel(pattern: Pattern): boolean {
  return pattern.width <= MAX_COLUMNS && pattern.height <= MAX_ROWS;
}

/** The worksheets of a chart: one cell per stitch with colour and symbol, then the legend. */
export function excelSheets(pattern: Pattern): Sheet<Blob>[] {
  const height = CELL_HEIGHT * cellAspect(pattern.craftType);
  const chart: (Cell | null)[][] = [];
  for (let y = 0; y < pattern.height; y++) {
    const row: (Cell | null)[] = [];
    for (let x = 0; x < pattern.width; x++) {
      const index = y * pattern.width + x;
      const color = pattern.palette[(pattern.cells[index] ?? 0) - 1];
      const symbol = symbolFor(pattern, pattern.symbols?.[index] ?? 0);
      row.push(
        color || symbol
          ? {
              value: symbol?.abbreviation ?? '',
              height,
              ...(color ? { backgroundColor: color } : {}),
            }
          : null,
      );
    }
    chart.push(row);
  }
  const legend: (Cell | null)[][] = [
    [
      { value: 'Colour', fontWeight: 'bold' },
      { value: 'Code', fontWeight: 'bold' },
      { value: 'Stitches', fontWeight: 'bold' },
    ],
    ...usedColors(pattern).map((entry) => [
      { value: '', backgroundColor: entry.color },
      { value: entry.color },
      { value: entry.count },
    ]),
    ...usedSymbols(pattern).map(({ symbol, count }) => [
      { value: symbol.name },
      { value: symbol.abbreviation },
      { value: count },
    ]),
  ];
  return [
    {
      data: chart,
      sheet: 'Chart',
      columns: new Array<{ width: number }>(pattern.width).fill({ width: CELL_WIDTH }),
    },
    { data: legend, sheet: 'Legend', columns: [{ width: 8 }, { width: 10 }, { width: 10 }] },
  ];
}

/** Writes the workbook in a web worker. The library is loaded on demand. */
export async function renderXlsx(pattern: Pattern): Promise<Blob> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  return writeExcelFile(excelSheets(pattern)).toBlob();
}
