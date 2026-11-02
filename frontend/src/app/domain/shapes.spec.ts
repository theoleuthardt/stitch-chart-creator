import { linePoints, rectanglePoints } from './shapes';

describe('linePoints', () => {
  it('is one point when start and end are the same', () => {
    expect(linePoints(2, 3, 2, 3)).toEqual([[2, 3]]);
  });

  it('draws horizontal and vertical lines without gaps', () => {
    expect(linePoints(0, 0, 3, 0)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
    expect(linePoints(1, 2, 1, 0)).toEqual([
      [1, 2],
      [1, 1],
      [1, 0],
    ]);
  });

  it('draws diagonals', () => {
    expect(linePoints(0, 0, 2, 2)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it('works in every direction', () => {
    expect(linePoints(3, 1, 0, 0)[0]).toEqual([3, 1]);
    expect(linePoints(3, 1, 0, 0).at(-1)).toEqual([0, 0]);
  });

  it('leaves no gaps between neighbouring points on steep lines', () => {
    const points = linePoints(0, 0, 3, 17);

    for (let index = 1; index < points.length; index++) {
      const [x0, y0] = points[index - 1] as [number, number];
      const [x1, y1] = points[index] as [number, number];
      expect(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))).toBe(1);
    }
    expect(points).toHaveLength(18);
  });
});

describe('rectanglePoints', () => {
  it('is the outline between two corners', () => {
    const points = rectanglePoints(0, 0, 2, 2);

    expect(points).toHaveLength(8);
    expect(points).not.toContainEqual([1, 1]);
  });

  it('accepts the corners in any order', () => {
    expect(new Set(rectanglePoints(3, 3, 1, 2).map(String))).toEqual(
      new Set(rectanglePoints(1, 2, 3, 3).map(String)),
    );
  });

  it('is a line when the corners share a row', () => {
    expect(rectanglePoints(0, 0, 2, 0)).toHaveLength(3);
  });

  it('is one point for equal corners', () => {
    expect(rectanglePoints(1, 1, 1, 1)).toEqual([[1, 1]]);
  });
});
