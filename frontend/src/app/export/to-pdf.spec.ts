import { createPattern, Pattern } from '../domain/pattern';
import { printableText, renderPdf } from './to-pdf';

const pattern: Pattern = {
  ...createPattern(200, 300, 'crossStitch', 'Big rose'),
  palette: ['#ff0000', '#00ff00'],
};
pattern.cells = pattern.cells.map((_, index) => (index % 5 === 0 ? 1 : 0));

const text = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsBinaryString(blob);
  });

const pageCount = async (blob: Blob) => ((await text(blob)).match(/\/Type \/Page\b/g) ?? []).length;

describe('printableText', () => {
  it('keeps the characters of the built-in PDF font', () => {
    expect(printableText('Blüte à la carte')).toBe('Blüte à la carte');
  });

  it('replaces what the built-in PDF font cannot show', () => {
    expect(printableText('Роза 花 🌹')).toBe('???? ? ?');
  });
});

describe('renderPdf', () => {
  it('creates a real PDF file', async () => {
    const blob = await renderPdf(createPattern(10, 10), { paper: 'a4', landscape: false });

    expect(blob.type).toBe('application/pdf');
    expect((await text(blob)).startsWith('%PDF-')).toBe(true);
  });

  it('adds the legend page after the chart pages', async () => {
    const blob = await renderPdf(createPattern(10, 10), { paper: 'a4', landscape: false });

    expect(await pageCount(blob)).toBe(2);
  });

  it('handles a chart with symbols', async () => {
    const knitted = { ...createPattern(4, 1, 'knitting'), symbols: [1, 3, 0, 2] };

    const blob = await renderPdf(knitted, { paper: 'a4', landscape: false });

    expect(await pageCount(blob)).toBe(2);
  });

  it('writes as many pages as the layout asks for', async () => {
    const blob = await renderPdf(pattern, { paper: 'a4', landscape: true });

    expect(await pageCount(blob)).toBeGreaterThan(3);
  });
});
