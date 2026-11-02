import { createPattern, Pattern } from '../domain/pattern';
import { changedRegion, ChartCanvasContext, ChartTheme, drawChart } from './chart-renderer';

const theme: ChartTheme = {
  paper: 'white',
  gridMinor: 'silver',
  gridMajor: 'gray',
  label: 'black',
  gutter: 'whitesmoke',
};

class Recorder implements ChartCanvasContext {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  textAlign = 'left' as CanvasTextAlign;
  textBaseline = 'alphabetic' as CanvasTextBaseline;
  fills: { style: string; x: number; y: number; w: number; h: number }[] = [];
  lines: { style: string; width: number; segments: number }[] = [];
  texts: string[] = [];
  clipped = false;
  private segments = 0;

  fillRect(x: number, y: number, w: number, h: number) {
    this.fills.push({ style: this.fillStyle, x, y, w, h });
  }
  beginPath() {
    this.segments = 0;
  }
  moveTo() {
    this.segments++;
  }
  lineTo() {
    return undefined;
  }
  stroke() {
    this.lines.push({ style: this.strokeStyle, width: this.lineWidth, segments: this.segments });
  }
  fillText(text: string) {
    this.texts.push(text);
  }
  save() {
    return undefined;
  }
  restore() {
    return undefined;
  }
  rect() {
    return undefined;
  }
  clip() {
    this.clipped = true;
  }
}

const chart = (cells: number[], width: number): Pattern => ({
  ...createPattern(width, cells.length / width),
  palette: ['#ff0000', '#00ff00'],
  cells,
});

const colored = (ctx: Recorder) => ctx.fills.filter((f) => f.style.startsWith('#'));

describe('drawChart', () => {
  const size = { width: 400, height: 400 };
  const view = { scale: 10, offsetX: 0, offsetY: 0 };

  it('merges neighbouring cells of one colour into one rectangle', () => {
    const ctx = new Recorder();

    drawChart(ctx, chart([1, 1, 2, 0], 4), view, size, theme);

    expect(colored(ctx)).toEqual([
      { style: '#ff0000', x: 0, y: 0, w: 20, h: 10 },
      { style: '#00ff00', x: 20, y: 0, w: 10, h: 10 },
    ]);
  });

  it('draws only the cells in the window', () => {
    const ctx = new Recorder();
    const big = createPattern(1000, 1000);
    const pattern = { ...big, cells: big.cells.map(() => 1) };

    drawChart(ctx, pattern, { scale: 100, offsetX: 0, offsetY: 0 }, size, theme);

    expect(colored(ctx).length).toBeLessThanOrEqual(5);
  });

  it('draws a grid line per cell when zoomed in', () => {
    const ctx = new Recorder();

    drawChart(ctx, chart([0, 0, 0, 0], 2), view, size, theme);

    expect(ctx.lines.some((line) => line.style === 'silver')).toBe(true);
  });

  it('draws no thin lines when zoomed far out', () => {
    const ctx = new Recorder();

    drawChart(ctx, chart([0, 0, 0, 0], 2), { ...view, scale: 2 }, size, theme);

    expect(ctx.lines.some((line) => line.style === 'silver')).toBe(false);
  });

  it('marks every tenth line more heavily', () => {
    const ctx = new Recorder();

    drawChart(ctx, createPattern(30, 30), view, size, theme);

    const heavy = ctx.lines.find((line) => line.style === 'gray');
    expect(heavy?.width).toBeGreaterThan(1);
    expect(heavy?.segments).toBe(8);
  });

  it('leaves the heavy lines out when they would crowd the chart', () => {
    const ctx = new Recorder();

    drawChart(ctx, createPattern(100, 100), { ...view, scale: 2 }, size, theme);

    expect(ctx.lines).toEqual([]);
  });

  it('numbers the rows and columns in tens', () => {
    const ctx = new Recorder();

    drawChart(ctx, createPattern(25, 25), view, size, theme);

    expect(ctx.texts.filter((text) => text === '10')).toHaveLength(2);
    expect(ctx.texts.filter((text) => text === '20')).toHaveLength(2);
    expect(ctx.texts).not.toContain('5');
  });

  it('limits a redraw to the changed region', () => {
    const ctx = new Recorder();

    drawChart(ctx, chart([1, 1, 1, 1], 4), view, size, theme, {
      fromX: 1,
      toX: 2,
      fromY: 0,
      toY: 0,
    });

    expect(ctx.clipped).toBe(true);
    expect(colored(ctx)).toEqual([{ style: '#ff0000', x: 10, y: 0, w: 20, h: 10 }]);
    expect(ctx.texts).toEqual([]);
  });

  it('skips a cell whose colour is missing instead of failing', () => {
    const ctx = new Recorder();

    drawChart(ctx, { ...chart([9], 1) }, view, size, theme);

    expect(colored(ctx)).toEqual([]);
  });
});

describe('changedRegion', () => {
  const before = chart([0, 0, 0, 0, 0, 0], 3);

  it('finds the bounding box of the changes', () => {
    expect(changedRegion(before, chart([0, 1, 0, 0, 0, 1], 3))).toEqual({
      fromX: 1,
      toX: 2,
      fromY: 0,
      toY: 1,
    });
  });

  it('reports nothing when the cells are the same', () => {
    expect(changedRegion(before, chart([0, 0, 0, 0, 0, 0], 3))).toBeNull();
  });

  it('asks for a full redraw when the size changed', () => {
    expect(changedRegion(before, chart([0, 0], 2))).toBe('all');
  });

  it('asks for a full redraw when the colours changed', () => {
    expect(changedRegion(before, { ...before, palette: ['#000000', '#00ff00'] })).toBe('all');
  });
});
