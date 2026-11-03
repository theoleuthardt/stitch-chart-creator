import { createPattern, Pattern } from '../domain/pattern';
import { ExportOptions } from './image-layout';
import { renderSvg } from './to-svg';

const pattern: Pattern = {
  ...createPattern(4, 2),
  palette: ['#ff0000', '#00ff00'],
  cells: [1, 1, 2, 0, 0, 0, 0, 1],
};

const options: ExportOptions = { cellSize: 10, gridLines: false, numbers: false, legend: false };

const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml');

describe('renderSvg', () => {
  it('is valid XML with the size of the chart', () => {
    const document = parse(renderSvg(pattern, options));

    expect(document.querySelector('parsererror')).toBeNull();
    const root = document.documentElement;
    expect(root.tagName).toBe('svg');
    expect(root.getAttribute('width')).toBe('40');
    expect(root.getAttribute('height')).toBe('20');
    expect(root.getAttribute('viewBox')).toBe('0 0 40 20');
  });

  it('merges neighbouring stitches of one colour', () => {
    const rects = [...parse(renderSvg(pattern, options)).querySelectorAll('g.cells rect')];

    expect(rects).toHaveLength(3);
    expect(rects[0]?.getAttribute('width')).toBe('20');
    expect(rects[0]?.getAttribute('fill')).toBe('#ff0000');
  });

  it('stays small for a big chart of one colour', () => {
    const big = { ...createPattern(500, 500), cells: new Array<number>(250_000).fill(1) };

    expect(renderSvg(big, options).length).toBeLessThan(100_000);
  });

  it('leaves the extras out unless they are chosen', () => {
    const document = parse(renderSvg(pattern, options));

    expect(document.querySelectorAll('line')).toHaveLength(0);
    expect(document.querySelectorAll('text')).toHaveLength(0);
  });

  it('draws the grid on request', () => {
    const document = parse(renderSvg(pattern, { ...options, gridLines: true }));

    expect(document.querySelectorAll('line').length).toBe(5 + 3);
  });

  it('marks every tenth line heavier', () => {
    const large = createPattern(20, 1);
    const document = parse(renderSvg(large, { ...options, gridLines: true }));

    const heavy = [...document.querySelectorAll('line[stroke-width="2"]')];
    const columns = heavy.filter((line) => line.getAttribute('x1') === line.getAttribute('x2'));
    expect(columns.map((line) => line.getAttribute('x1'))).toEqual(['0', '100', '200']);
    expect(heavy).toHaveLength(columns.length + 1);
  });

  it('numbers rows and columns on request', () => {
    const large = createPattern(20, 20);
    const texts = parse(renderSvg(large, { ...options, numbers: true })).querySelectorAll('text');

    expect([...texts].map((text) => text.textContent)).toEqual(['10', '20', '10', '20']);
  });

  it('lists the used colours in the legend', () => {
    const document = parse(renderSvg(pattern, { ...options, legend: true }));

    expect(document.documentElement.textContent).toContain('#ff0000');
    expect(document.documentElement.textContent).toContain('3 stitches');
  });

  it('draws symbols as lines and circles', () => {
    const knitted = { ...createPattern(2, 1, 'knitting'), symbols: [1, 3] };

    const document = parse(renderSvg(knitted, options));

    expect(document.querySelectorAll('g.symbols line')).toHaveLength(1);
    expect(document.querySelectorAll('g.symbols circle')).toHaveLength(1);
  });

  it('uses the height of a knitted stitch', () => {
    const knitted = { ...createPattern(2, 2, 'knitting'), cells: [1, 1, 1, 1] };

    const document = parse(renderSvg(knitted, options));

    expect(document.documentElement.getAttribute('height')).toBe('16');
    expect(document.querySelector('g.cells rect')?.getAttribute('height')).toBe('8');
  });

  it('lists the symbols in the legend', () => {
    const knitted = { ...createPattern(1, 1, 'knitting'), symbols: [1] };

    const document = parse(renderSvg(knitted, { ...options, legend: true }));

    expect(document.documentElement.textContent).toContain('k   Knit   1 stitches');
  });

  it('never adds branding', () => {
    const svg = renderSvg(pattern, { ...options, gridLines: true, numbers: true, legend: true });

    expect(svg).not.toMatch(/stitch chart creator|made with|http:\/\/(?!www\.w3\.org)/i);
  });
});
