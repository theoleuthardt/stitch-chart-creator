import { createPattern, Pattern } from '../domain/pattern';
import { canvasFits, exportLayout, ExportOptions, usedColors } from './image-layout';

const pattern: Pattern = {
  ...createPattern(10, 20),
  palette: ['#ff0000', '#00ff00', '#0000ff'],
  cells: new Array<number>(200).fill(0).map((_, index) => (index < 5 ? 1 : index < 8 ? 3 : 0)),
};

const options: ExportOptions = { cellSize: 10, gridLines: true, numbers: false, legend: false };

describe('exportLayout', () => {
  it('is exactly the chart without extras', () => {
    expect(exportLayout(pattern, options)).toMatchObject({
      width: 100,
      height: 200,
      chartX: 0,
      chartY: 0,
    });
  });

  it('adds strips for the numbers', () => {
    const layout = exportLayout(pattern, { ...options, numbers: true });

    expect(layout.chartX).toBeGreaterThan(0);
    expect(layout.chartY).toBe(layout.chartX);
    expect(layout.width).toBe(100 + layout.chartX);
    expect(layout.height).toBe(200 + layout.chartY);
  });

  it('adds a row per used colour for the legend', () => {
    const plain = exportLayout(pattern, options);
    const layout = exportLayout(pattern, { ...options, legend: true });

    expect(layout.legendY).toBe(200);
    expect(layout.legendRows).toBe(2);
    expect(layout.height).toBeGreaterThan(plain.height);
  });

  it('keeps the legend readable on a narrow chart', () => {
    const narrow = { ...pattern, width: 1, height: 1, cells: [1] };

    expect(exportLayout(narrow, { ...options, legend: true }).width).toBeGreaterThan(100);
  });

  it('grows with the cell size', () => {
    expect(exportLayout(pattern, { ...options, cellSize: 40 }).width).toBe(400);
  });
});

describe('usedColors', () => {
  it('lists the colours in use with their stitch counts', () => {
    expect(usedColors(pattern)).toEqual([
      { number: 1, color: '#ff0000', count: 5 },
      { number: 3, color: '#0000ff', count: 3 },
    ]);
  });
});

describe('canvasFits', () => {
  it('accepts normal sizes', () => {
    expect(canvasFits(8000, 8000)).toBe(true);
  });

  it('refuses a side beyond the browser limit', () => {
    expect(canvasFits(40000, 10)).toBe(false);
  });

  it('refuses an area beyond the browser limit', () => {
    expect(canvasFits(20000, 20000)).toBe(false);
  });
});
