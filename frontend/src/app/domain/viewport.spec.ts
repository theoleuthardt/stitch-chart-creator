import {
  cellAt,
  fitToWindow,
  MAX_SCALE,
  MIN_SCALE,
  panBy,
  pinch,
  Viewport,
  visibleRange,
  zoomAt,
} from './viewport';

const view: Viewport = { scale: 10, offsetX: 50, offsetY: 20 };

describe('cellAt', () => {
  it('finds the cell under a screen position', () => {
    expect(cellAt(view, 50, 20)).toEqual([0, 0]);
    expect(cellAt(view, 59, 29)).toEqual([0, 0]);
    expect(cellAt(view, 60, 30)).toEqual([1, 1]);
  });

  it('reports positions left of and above the chart as negative', () => {
    expect(cellAt(view, 49, 19)).toEqual([-1, -1]);
  });
});

describe('stitches that are not square', () => {
  const flat: Viewport = { scale: 10, offsetX: 0, offsetY: 0, aspect: 0.5 };

  it('finds the row by the height of a stitch', () => {
    expect(cellAt(flat, 25, 12)).toEqual([2, 2]);
  });

  it('keeps the point under the pointer while zooming', () => {
    const zoomed = zoomAt(flat, 2, 40, 40);

    expect(zoomed.aspect).toBe(0.5);
    expect(cellAt(zoomed, 40, 40)).toEqual(cellAt(flat, 40, 40));
  });

  it('counts the visible rows by their height', () => {
    expect(visibleRange(flat, 100, 50, 100, 100).toY).toBe(9);
  });

  it('fits the chart by the height of its stitches', () => {
    const fitted = fitToWindow(10, 10, 100, 100, 0, 0.5);

    expect(fitted.scale).toBe(10);
    expect(fitted.aspect).toBe(0.5);
    expect(fitted.offsetY).toBe(25);
  });
});

describe('zoomAt', () => {
  it('keeps the point under the pointer in place', () => {
    const zoomed = zoomAt(view, 2, 110, 80);

    expect(zoomed.scale).toBe(20);
    expect(cellAt(zoomed, 110, 80)).toEqual(cellAt(view, 110, 80));
    expect((110 - zoomed.offsetX) / zoomed.scale).toBeCloseTo((110 - view.offsetX) / view.scale);
  });

  it('stops at the limits', () => {
    expect(zoomAt(view, 1000, 0, 0).scale).toBe(MAX_SCALE);
    expect(zoomAt(view, 0.0001, 0, 0).scale).toBe(MIN_SCALE);
  });

  it('does not move when the limit is already reached', () => {
    const limit = { ...view, scale: MAX_SCALE };

    expect(zoomAt(limit, 2, 100, 100)).toEqual(limit);
  });
});

describe('panBy', () => {
  it('moves the chart', () => {
    expect(panBy(view, 5, -5)).toEqual({ scale: 10, offsetX: 55, offsetY: 15 });
  });
});

describe('pinch', () => {
  it('zooms with the distance between two fingers', () => {
    const result = pinch(view, [100, 100], [200, 100], [50, 100], [250, 100]);

    expect(result.scale).toBeCloseTo(20);
  });

  it('pans with the middle between two fingers', () => {
    const result = pinch(view, [100, 100], [200, 100], [130, 110], [230, 110]);

    expect(result.scale).toBeCloseTo(10);
    expect(result.offsetX).toBeCloseTo(80);
    expect(result.offsetY).toBeCloseTo(30);
  });
});

describe('pinch with fingers on one spot', () => {
  it('only pans instead of dividing by zero', () => {
    const result = pinch(view, [100, 100], [100, 100], [110, 120], [130, 120]);

    expect(result.scale).toBe(10);
    expect(Number.isFinite(result.offsetX)).toBe(true);
    expect(Number.isFinite(result.offsetY)).toBe(true);
  });
});

describe('fitToWindow', () => {
  it('fits a chart and centres it', () => {
    const fitted = fitToWindow(100, 50, 1000, 1000, 0);

    expect(fitted.scale).toBe(10);
    expect(fitted.offsetX).toBe(0);
    expect(fitted.offsetY).toBe(250);
  });

  it('leaves the margin free', () => {
    const fitted = fitToWindow(100, 100, 1000, 1000, 100);

    expect(fitted.scale).toBe(8);
    expect(fitted.offsetX).toBe(100);
  });

  it('does not blow up a tiny chart beyond the comfortable size', () => {
    expect(fitToWindow(2, 2, 2000, 2000, 0).scale).toBeLessThanOrEqual(64);
  });

  it('survives a window that has no size yet', () => {
    expect(fitToWindow(10, 10, 0, 0, 20).scale).toBe(MIN_SCALE);
  });
});

describe('visibleRange', () => {
  it('limits drawing to the cells in the window', () => {
    expect(visibleRange({ scale: 10, offsetX: -25, offsetY: 0 }, 100, 50, 100, 100)).toEqual({
      fromX: 2,
      toX: 12,
      fromY: 0,
      toY: 4,
    });
  });

  it('never leaves the chart', () => {
    expect(
      visibleRange({ scale: 10, offsetX: 500, offsetY: 500 }, 100, 100, 3, 3).toX,
    ).toBeLessThan(0);
    expect(visibleRange({ scale: 10, offsetX: 0, offsetY: 0 }, 1000, 1000, 3, 3)).toEqual({
      fromX: 0,
      toX: 2,
      fromY: 0,
      toY: 2,
    });
  });
});
