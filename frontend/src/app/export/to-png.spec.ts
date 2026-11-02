import { ChartCanvasContext } from '../chart/chart-renderer';
import { createPattern, Pattern } from '../domain/pattern';
import { ExportOptions } from './image-layout';
import { drawExport } from './to-png';

class Recorder {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  textAlign = 'left';
  textBaseline = 'alphabetic';
  fills: string[] = [];
  texts: string[] = [];
  strokes = 0;

  fillRect(): void {
    this.fills.push(this.fillStyle);
  }
  fillText(text: string): void {
    this.texts.push(text);
  }
  stroke(): void {
    this.strokes++;
  }
  beginPath = () => undefined;
  moveTo = () => undefined;
  lineTo = () => undefined;
}

const pattern: Pattern = { ...createPattern(20, 20), palette: ['#ff0000'], cells: [] };
pattern.cells = new Array<number>(400).fill(1);

const options: ExportOptions = { cellSize: 5, gridLines: false, numbers: false, legend: false };

const draw = (changes: Partial<ExportOptions>) => {
  const ctx = new Recorder();
  drawExport(ctx as unknown as ChartCanvasContext, pattern, { ...options, ...changes });
  return ctx;
};

describe('drawExport', () => {
  it('draws the chart on white paper', () => {
    const ctx = draw({});

    expect(ctx.fills[0]).toBe('#ffffff');
    expect(ctx.fills).toContain('#ff0000');
  });

  it('never adds branding', () => {
    const ctx = draw({ gridLines: true, numbers: true, legend: true });

    expect(ctx.texts.join(' ')).not.toMatch(/stitch chart creator|made with|www|http/i);
  });

  it('leaves the extras out unless they are chosen', () => {
    const ctx = draw({});

    expect(ctx.strokes).toBe(0);
    expect(ctx.texts).toEqual([]);
  });

  it('draws grid lines on request', () => {
    expect(draw({ gridLines: true }).strokes).toBeGreaterThan(0);
  });

  it('draws numbers on request', () => {
    expect(draw({ numbers: true }).texts).toEqual(['10', '20', '10', '20']);
  });

  it('draws a legend on request', () => {
    expect(draw({ legend: true }).texts).toEqual(['#ff0000   400 stitches']);
  });
});
