import { createPattern, Pattern } from './pattern';
import {
  EMPTY_PROGRESS,
  finishRow,
  isCellDone,
  markAt,
  moveRow,
  percentDone,
  Progress,
  toggleCell,
  toggleRow,
} from './progress';

const chart: Pattern = { ...createPattern(2, 3), cells: [1, 1, 1, 0, 1, 1] };

describe('toggleRow', () => {
  it('marks a row as done and back', () => {
    const done = toggleRow(EMPTY_PROGRESS, 1);

    expect(done.doneRows).toEqual([1]);
    expect(toggleRow(done, 1).doneRows).toEqual([]);
  });

  it('does not change the original', () => {
    toggleRow(EMPTY_PROGRESS, 1);

    expect(EMPTY_PROGRESS.doneRows).toEqual([]);
  });
});

describe('toggleCell', () => {
  it('marks a cell as done and back', () => {
    const done = toggleCell(EMPTY_PROGRESS, 3);

    expect(done.doneCells).toEqual([3]);
    expect(toggleCell(done, 3).doneCells).toEqual([]);
  });
});

describe('markAt', () => {
  it('marks the row of a cell in row mode', () => {
    expect(markAt(chart, EMPTY_PROGRESS, 'row', 1, 2).doneRows).toEqual([2]);
  });

  it('marks the cell in stitch mode', () => {
    expect(markAt(chart, EMPTY_PROGRESS, 'stitch', 1, 1).doneCells).toEqual([3]);
  });

  it('leaves the progress alone beside the chart', () => {
    expect(markAt(chart, EMPTY_PROGRESS, 'row', 5, 5)).toBe(EMPTY_PROGRESS);
    expect(markAt(chart, EMPTY_PROGRESS, 'stitch', -1, 0)).toBe(EMPTY_PROGRESS);
  });
});

describe('isCellDone', () => {
  const progress: Progress = { doneRows: [2], doneCells: [1], currentRow: 0 };

  it('knows single cells', () => {
    expect(isCellDone(chart, progress, 0, 0)).toBe(false);
    expect(isCellDone(chart, progress, 1, 0)).toBe(true);
  });

  it('knows the cells of a finished row', () => {
    expect(isCellDone(chart, progress, 0, 2)).toBe(true);
  });
});

describe('moveRow', () => {
  it('moves forward and back', () => {
    expect(moveRow(EMPTY_PROGRESS, 1, 3).currentRow).toBe(1);
    expect(moveRow({ ...EMPTY_PROGRESS, currentRow: 2 }, -1, 3).currentRow).toBe(1);
  });

  it('stops at both ends', () => {
    expect(moveRow(EMPTY_PROGRESS, -1, 3).currentRow).toBe(0);
    expect(moveRow({ ...EMPTY_PROGRESS, currentRow: 2 }, 1, 3).currentRow).toBe(2);
  });
});

describe('finishRow', () => {
  it('marks the current row and moves on', () => {
    const next = finishRow(EMPTY_PROGRESS, 3);

    expect(next.doneRows).toEqual([0]);
    expect(next.currentRow).toBe(1);
  });

  it('does not mark a row twice', () => {
    const next = finishRow({ doneRows: [0], doneCells: [], currentRow: 0 }, 3);

    expect(next.doneRows).toEqual([0]);
  });

  it('stays on the last row', () => {
    expect(finishRow({ ...EMPTY_PROGRESS, currentRow: 2 }, 3).currentRow).toBe(2);
  });
});

describe('percentDone', () => {
  it('counts stitches, not empty cells', () => {
    expect(percentDone(chart, { doneRows: [1], doneCells: [], currentRow: 0 })).toBe(20);
  });

  it('counts a stitch once when row and cell overlap', () => {
    expect(percentDone(chart, { doneRows: [0], doneCells: [0], currentRow: 0 })).toBe(40);
  });

  it('is complete when all rows are done', () => {
    expect(percentDone(chart, { doneRows: [0, 1, 2], doneCells: [], currentRow: 0 })).toBe(100);
  });

  it('counts symbols as stitches too', () => {
    const knitted = { ...createPattern(2, 1, 'knitting'), symbols: [1, 1] };

    expect(percentDone(knitted, { doneRows: [], doneCells: [0], currentRow: 0 })).toBe(50);
  });

  it('is zero for an empty chart', () => {
    expect(percentDone(createPattern(2, 2), EMPTY_PROGRESS)).toBe(0);
  });
});
