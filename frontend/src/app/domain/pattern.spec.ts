import {
  cellIndex,
  colorUsage,
  createPattern,
  floodFill,
  getCell,
  inBounds,
  mirrorHorizontal,
  mirrorVertical,
  Pattern,
  resize,
  rotateClockwise,
  rotateCounterClockwise,
  setCell,
  setCells,
} from './pattern';

const chart = (width: number, height: number, cells: number[], symbols?: number[]): Pattern => ({
  ...createPattern(width, height),
  palette: ['#ff0000', '#00ff00', '#0000ff'],
  cells,
  symbols,
});

describe('createPattern', () => {
  it('creates an empty chart of the requested size', () => {
    const pattern = createPattern(3, 2);

    expect(pattern.width).toBe(3);
    expect(pattern.height).toBe(2);
    expect(pattern.cells).toEqual([0, 0, 0, 0, 0, 0]);
    expect(pattern.craftType).toBe('crossStitch');
  });

  it('starts with one colour to draw with', () => {
    expect(createPattern(1, 1).palette).toHaveLength(1);
  });

  it('takes a craft type and a title', () => {
    const pattern = createPattern(1, 1, 'knitting', 'Scarf');

    expect(pattern.craftType).toBe('knitting');
    expect(pattern.title).toBe('Scarf');
  });
});

describe('cell access', () => {
  const pattern = chart(3, 2, [1, 2, 3, 0, 1, 2]);

  it('maps coordinates to the flat array row by row', () => {
    expect(cellIndex(pattern, 0, 0)).toBe(0);
    expect(cellIndex(pattern, 2, 0)).toBe(2);
    expect(cellIndex(pattern, 0, 1)).toBe(3);
    expect(cellIndex(pattern, 2, 1)).toBe(5);
  });

  it('knows what lies inside the chart', () => {
    expect(inBounds(pattern, 0, 0)).toBe(true);
    expect(inBounds(pattern, 2, 1)).toBe(true);
    expect(inBounds(pattern, 3, 0)).toBe(false);
    expect(inBounds(pattern, 0, 2)).toBe(false);
    expect(inBounds(pattern, -1, 0)).toBe(false);
  });

  it('reads a cell', () => {
    expect(getCell(pattern, 1, 1)).toBe(1);
  });

  it('reads nothing outside the chart', () => {
    expect(getCell(pattern, 3, 0)).toBeUndefined();
  });

  it('writes a cell into a new chart', () => {
    const changed = setCell(pattern, 1, 0, 3);

    expect(getCell(changed, 1, 0)).toBe(3);
    expect(getCell(pattern, 1, 0)).toBe(2);
  });

  it('ignores a write outside the chart', () => {
    expect(setCell(pattern, 5, 5, 1)).toBe(pattern);
  });

  it('returns the same chart when a write changes nothing', () => {
    expect(setCell(pattern, 0, 0, 1)).toBe(pattern);
  });

  it('writes several cells in one copy', () => {
    const changed = setCells(
      pattern,
      [
        [0, 0],
        [2, 1],
        [9, 9],
      ],
      3,
    );

    expect(changed.cells).toEqual([3, 2, 3, 0, 1, 3]);
    expect(pattern.cells).toEqual([1, 2, 3, 0, 1, 2]);
  });

  it('returns the same chart when several writes change nothing', () => {
    expect(setCells(pattern, [[0, 0]], 1)).toBe(pattern);
  });
});

describe('resize', () => {
  const pattern = chart(2, 2, [1, 2, 3, 1]);

  it('grows to the right and to the bottom with empty cells', () => {
    const grown = resize(pattern, 3, 3);

    expect(grown.width).toBe(3);
    expect(grown.height).toBe(3);
    expect(grown.cells).toEqual([1, 2, 0, 3, 1, 0, 0, 0, 0]);
  });

  it('crops at the right and the bottom', () => {
    const cropped = resize(chart(3, 2, [1, 2, 3, 3, 2, 1]), 2, 1);

    expect(cropped.cells).toEqual([1, 2]);
  });

  it('keeps the symbol layer aligned', () => {
    const grown = resize(chart(2, 1, [1, 2], [7, 8]), 3, 2);

    expect(grown.symbols).toEqual([7, 8, 0, 0, 0, 0]);
  });

  it('does not change the original', () => {
    resize(pattern, 5, 5);

    expect(pattern.cells).toEqual([1, 2, 3, 1]);
  });
});

describe('floodFill', () => {
  it('fills the connected area of the same colour', () => {
    const pattern = chart(3, 3, [1, 1, 2, 1, 2, 2, 2, 2, 1]);

    expect(floodFill(pattern, 0, 0, 3).cells).toEqual([3, 3, 2, 3, 2, 2, 2, 2, 1]);
  });

  it('does not cross diagonals', () => {
    const pattern = chart(2, 2, [1, 2, 2, 1]);

    expect(floodFill(pattern, 0, 0, 3).cells).toEqual([3, 2, 2, 1]);
  });

  it('fills empty cells too', () => {
    expect(floodFill(chart(2, 1, [0, 0]), 0, 0, 1).cells).toEqual([1, 1]);
  });

  it('returns the same chart when the colour is already there', () => {
    const pattern = chart(2, 1, [1, 1]);

    expect(floodFill(pattern, 0, 0, 1)).toBe(pattern);
  });

  it('ignores a start outside the chart', () => {
    const pattern = chart(2, 1, [1, 1]);

    expect(floodFill(pattern, 9, 9, 2)).toBe(pattern);
  });

  it('handles a large area without exhausting the stack', () => {
    const pattern = createPattern(1000, 1000);

    expect(floodFill(pattern, 500, 500, 1).cells.every((cell) => cell === 1)).toBe(true);
  });
});

describe('mirroring', () => {
  const pattern = chart(3, 2, [1, 2, 3, 0, 0, 1]);

  it('mirrors left and right', () => {
    expect(mirrorHorizontal(pattern).cells).toEqual([3, 2, 1, 1, 0, 0]);
  });

  it('mirrors top and bottom', () => {
    expect(mirrorVertical(pattern).cells).toEqual([0, 0, 1, 1, 2, 3]);
  });

  it('is its own inverse', () => {
    expect(mirrorHorizontal(mirrorHorizontal(pattern)).cells).toEqual(pattern.cells);
    expect(mirrorVertical(mirrorVertical(pattern)).cells).toEqual(pattern.cells);
  });

  it('carries the symbols along', () => {
    expect(mirrorHorizontal(chart(2, 1, [1, 2], [7, 8])).symbols).toEqual([8, 7]);
  });
});

describe('rotation', () => {
  const pattern = chart(3, 2, [1, 2, 3, 0, 0, 1]);

  it('rotates clockwise and swaps the sides', () => {
    const rotated = rotateClockwise(pattern);

    expect(rotated.width).toBe(2);
    expect(rotated.height).toBe(3);
    expect(rotated.cells).toEqual([0, 1, 0, 2, 1, 3]);
  });

  it('rotates counter-clockwise and swaps the sides', () => {
    const rotated = rotateCounterClockwise(pattern);

    expect(rotated.width).toBe(2);
    expect(rotated.height).toBe(3);
    expect(rotated.cells).toEqual([3, 1, 2, 0, 1, 0]);
  });

  it('is undone by the opposite rotation', () => {
    expect(rotateCounterClockwise(rotateClockwise(pattern)).cells).toEqual(pattern.cells);
  });

  it('returns to the start after four turns', () => {
    const turned = rotateClockwise(rotateClockwise(rotateClockwise(rotateClockwise(pattern))));

    expect(turned.cells).toEqual(pattern.cells);
    expect(turned.width).toBe(3);
  });

  it('carries the symbols along', () => {
    expect(rotateClockwise(chart(2, 1, [1, 2], [7, 8])).symbols).toEqual([7, 8]);
  });
});

describe('colorUsage', () => {
  it('counts how often each palette entry is used', () => {
    expect(colorUsage(chart(3, 2, [1, 1, 3, 0, 1, 3]))).toEqual([3, 0, 2]);
  });

  it('counts nothing on an empty chart', () => {
    expect(colorUsage(createPattern(2, 2))).toEqual([0]);
  });
});
