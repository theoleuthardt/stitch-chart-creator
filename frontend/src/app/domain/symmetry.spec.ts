import { withSymmetry } from './symmetry';

describe('withSymmetry', () => {
  it('leaves points alone without an axis', () => {
    expect(withSymmetry([[1, 2]], 10, 10, { horizontal: false, vertical: false })).toEqual([
      [1, 2],
    ]);
  });

  it('mirrors across the vertical middle line', () => {
    expect(withSymmetry([[1, 2]], 10, 10, { horizontal: true, vertical: false })).toEqual([
      [1, 2],
      [8, 2],
    ]);
  });

  it('mirrors across the horizontal middle line', () => {
    expect(withSymmetry([[1, 2]], 10, 10, { horizontal: false, vertical: true })).toEqual([
      [1, 2],
      [1, 7],
    ]);
  });

  it('mirrors into all four quadrants with both axes', () => {
    const points = withSymmetry([[1, 2]], 10, 10, { horizontal: true, vertical: true });

    expect(points).toHaveLength(4);
    expect(points).toEqual(
      expect.arrayContaining([
        [1, 2],
        [8, 2],
        [1, 7],
        [8, 7],
      ]),
    );
  });

  it('respects a chart that is not square', () => {
    expect(withSymmetry([[0, 0]], 5, 3, { horizontal: true, vertical: true })).toContainEqual([
      4, 2,
    ]);
  });
});
