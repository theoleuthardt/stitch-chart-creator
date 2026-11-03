import { checkPattern, Finding, findingText } from './checks';
import { createPattern, Pattern } from './pattern';

const chart = (width: number, cells: number[], palette = ['#ff0000', '#0000ff']): Pattern => ({
  ...createPattern(width, cells.length / width),
  palette,
  cells,
});

const ofKind = (findings: Finding[], kind: Finding['kind']) =>
  findings.filter((finding) => finding.kind === kind);

describe('isolated stitches', () => {
  it('finds a single stitch without a neighbour of its colour', () => {
    const pattern = chart(3, [1, 1, 1, 1, 2, 1, 1, 1, 1]);

    const found = ofKind(checkPattern(pattern), 'isolated');

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ x: 1, y: 1 });
  });

  it('leaves stitches with a neighbour of their colour alone', () => {
    const pattern = chart(3, [1, 1, 1, 2, 2, 1, 1, 1, 1]);

    expect(ofKind(checkPattern(pattern), 'isolated')).toEqual([]);
  });

  it('does not count diagonals as neighbours', () => {
    const pattern = chart(2, [2, 1, 1, 2]);

    expect(ofKind(checkPattern(pattern), 'isolated')).toHaveLength(4);
  });

  it('ignores empty cells', () => {
    expect(ofKind(checkPattern(chart(2, [0, 0, 0, 0], ['#000000'])), 'isolated')).toEqual([]);
  });

  it('skips knitting and crochet, where colour stitches stand alone on purpose', () => {
    const pattern = { ...chart(3, [1, 0, 2]), craftType: 'knitting' as const };

    expect(ofKind(checkPattern(pattern), 'isolated')).toEqual([]);
  });
});

describe('unused colours', () => {
  it('finds palette entries no stitch uses', () => {
    const found = ofKind(checkPattern(chart(2, [1, 1])), 'unusedColor');

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ color: 2 });
  });
});

describe('similar colours', () => {
  it('finds colours that can hardly be told apart', () => {
    const found = ofKind(checkPattern(chart(2, [1, 2], ['#ff0000', '#fd0102'])), 'similarColors');

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ color: 1, otherColor: 2 });
  });

  it('accepts clearly different colours', () => {
    expect(ofKind(checkPattern(chart(2, [1, 2])), 'similarColors')).toEqual([]);
  });
});

describe('uneven rows', () => {
  const knitted = (rows: number[][]): Pattern => ({
    ...createPattern(rows[0]?.length ?? 0, rows.length, 'knitting'),
    symbols: rows.flat(),
  });

  it('finds a row with another stitch count than the rows around it', () => {
    const pattern = knitted([
      [1, 1, 1, 1],
      [1, 1, 0, 0],
      [1, 1, 1, 1],
    ]);

    const found = ofKind(checkPattern(pattern), 'unevenRow');

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ y: 1, count: 2, expected: 4 });
  });

  it('accepts even rows', () => {
    const pattern = knitted([
      [1, 1],
      [2, 2],
    ]);

    expect(ofKind(checkPattern(pattern), 'unevenRow')).toEqual([]);
  });

  it('ignores completely empty rows', () => {
    const pattern = knitted([
      [1, 1],
      [0, 0],
      [1, 1],
    ]);

    expect(ofKind(checkPattern(pattern), 'unevenRow')).toEqual([]);
  });

  it('accepts a shape that grows row by row', () => {
    const pattern = knitted([
      [1, 0, 0, 0],
      [1, 1, 0, 0],
      [1, 1, 1, 0],
      [1, 1, 1, 1],
    ]);

    expect(ofKind(checkPattern(pattern), 'unevenRow')).toEqual([]);
  });

  it('leaves colour charts out', () => {
    expect(ofKind(checkPattern(chart(2, [1, 0, 1, 1])), 'unevenRow')).toEqual([]);
  });
});

describe('the order of the findings', () => {
  it('puts what affects the whole chart in front of single stitches', () => {
    const pattern = chart(3, [2, 1, 2], ['#ff0000', '#0000ff', '#00ff00']);

    expect(checkPattern(pattern)[0]?.kind).toBe('unusedColor');
  });
});

describe('a clean chart', () => {
  it('has no findings', () => {
    expect(checkPattern(chart(2, [1, 1, 2, 2]))).toEqual([]);
  });
});

describe('findingText', () => {
  const pattern = chart(2, [1, 2]);

  it('names the place in the numbering of the chart', () => {
    expect(findingText({ kind: 'isolated', x: 1, y: 2, color: 1 }, pattern)).toBe(
      'Single stitch in row 3, column 2',
    );
  });

  it('names the colours', () => {
    expect(findingText({ kind: 'unusedColor', color: 2 }, pattern)).toBe('#0000ff is not used');
    expect(findingText({ kind: 'similarColors', color: 1, otherColor: 2 }, pattern)).toBe(
      '#ff0000 and #0000ff look almost the same',
    );
  });

  it('names the counts of a row', () => {
    expect(findingText({ kind: 'unevenRow', y: 4, count: 2, expected: 4 }, pattern)).toBe(
      'Row 5 has 2 stitches, the rows around it have 4',
    );
  });
});
