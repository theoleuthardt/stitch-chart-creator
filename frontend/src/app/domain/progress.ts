import { Pattern } from './pattern';

/** How far a chart has been stitched. Rows count from 0, cells are indices of the flat array. */
export interface Progress {
  doneRows: number[];
  doneCells: number[];
  currentRow: number;
}

export const EMPTY_PROGRESS: Progress = { doneRows: [], doneCells: [], currentRow: 0 };

function toggled(values: readonly number[], value: number): number[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export function toggleRow(progress: Progress, row: number): Progress {
  return { ...progress, doneRows: toggled(progress.doneRows, row) };
}

export function toggleCell(progress: Progress, index: number): Progress {
  return { ...progress, doneCells: toggled(progress.doneCells, index) };
}

export function isCellDone(pattern: Pattern, progress: Progress, x: number, y: number): boolean {
  return progress.doneRows.includes(y) || progress.doneCells.includes(y * pattern.width + x);
}

/** Moves the current row, staying on the chart. */
export function moveRow(progress: Progress, delta: number, height: number): Progress {
  return {
    ...progress,
    currentRow: Math.min(height - 1, Math.max(0, progress.currentRow + delta)),
  };
}

/** Marks the current row as done and goes on to the next one. */
export function finishRow(progress: Progress, height: number): Progress {
  const { doneRows, currentRow } = progress;
  return moveRow(
    { ...progress, doneRows: doneRows.includes(currentRow) ? doneRows : [...doneRows, currentRow] },
    1,
    height,
  );
}

/** The share of the chart's stitches that are done, in whole percent. */
export function percentDone(pattern: Pattern, progress: Progress): number {
  const rows = new Set(progress.doneRows);
  const cells = new Set(progress.doneCells);
  let total = 0;
  let done = 0;
  for (let index = 0; index < pattern.cells.length; index++) {
    if ((pattern.cells[index] ?? 0) > 0 || (pattern.symbols?.[index] ?? 0) > 0) {
      total++;
      if (rows.has(Math.floor(index / pattern.width)) || cells.has(index)) {
        done++;
      }
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
