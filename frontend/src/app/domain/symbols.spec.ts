import { createPattern, Pattern } from './pattern';
import {
  cellAspect,
  contrastColor,
  embedStitch,
  setSymbols,
  StitchDrawing,
  symbolById,
  symbolFor,
  symbolInk,
  SYMBOLS,
  symbolsFor,
  usedSymbols,
} from './symbols';

describe('the symbol library', () => {
  it('has symbols for knitting and crochet', () => {
    expect(symbolsFor('knitting').map((symbol) => symbol.name)).toContain('Knit');
    expect(symbolsFor('crochet').map((symbol) => symbol.name)).toContain('Chain');
  });

  it('has none for the colour crafts', () => {
    expect(symbolsFor('crossStitch')).toEqual([]);
    expect(symbolsFor('pixelArt')).toEqual([]);
  });

  it('gives every symbol its own id above zero', () => {
    const ids = SYMBOLS.map((symbol) => symbol.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.min(...ids)).toBeGreaterThan(0);
  });

  it('draws every symbol inside its cell', () => {
    for (const symbol of SYMBOLS) {
      expect(symbol.lines.length + symbol.circles.length).toBeGreaterThan(0);
      for (const value of [...symbol.lines.flat(), ...symbol.circles.flat()]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('finds a symbol by id', () => {
    expect(symbolById(SYMBOLS[0]?.id ?? 0)).toBe(SYMBOLS[0]);
    expect(symbolById(9999)).toBeUndefined();
  });
});

describe('custom stitches', () => {
  const bobble: StitchDrawing = {
    name: 'Bobble',
    abbreviation: 'bo',
    lines: [[0, 0, 1, 1]],
    circles: [],
  };

  it('embeds a stitch in the chart under the first free number', () => {
    const { pattern, id } = embedStitch(createPattern(1, 1, 'crochet'), bobble);

    expect(id).toBe(1000);
    expect(pattern.customStitches).toEqual([{ ...bobble, id: 1000 }]);
  });

  it('gives the next stitch the next number', () => {
    const first = embedStitch(createPattern(1, 1), bobble).pattern;

    expect(embedStitch(first, { ...bobble, name: 'Popcorn' }).id).toBe(1001);
  });

  it('reuses a stitch that is already in the chart', () => {
    const first = embedStitch(createPattern(1, 1), bobble).pattern;

    const second = embedStitch(first, bobble);

    expect(second.id).toBe(1000);
    expect(second.pattern).toBe(first);
  });

  it('finds built-in and embedded stitches', () => {
    const { pattern, id } = embedStitch(createPattern(1, 1), bobble);

    expect(symbolFor(pattern, 1)?.name).toBe('Knit');
    expect(symbolFor(pattern, id)?.name).toBe('Bobble');
    expect(symbolFor(pattern, 1234)).toBeUndefined();
  });

  it('counts embedded stitches', () => {
    const { pattern, id } = embedStitch(createPattern(2, 1), bobble);

    expect(usedSymbols({ ...pattern, symbols: [id, id] })).toEqual([
      { symbol: expect.objectContaining({ name: 'Bobble' }), count: 2 },
    ]);
  });
});

describe('cellAspect', () => {
  it('keeps colour charts square', () => {
    expect(cellAspect('crossStitch')).toBe(1);
    expect(cellAspect('pixelArt')).toBe(1);
  });

  it('makes knitted stitches wider than tall', () => {
    expect(cellAspect('knitting')).toBeLessThan(1);
  });
});

describe('setSymbols', () => {
  const chart = createPattern(2, 2, 'knitting');

  it('creates the layer on the first symbol', () => {
    expect(setSymbols(chart, [[1, 0]], 3).symbols).toEqual([0, 3, 0, 0]);
  });

  it('writes into a new chart', () => {
    const first = setSymbols(chart, [[0, 0]], 3);
    const second = setSymbols(first, [[1, 1]], 4);

    expect(first.symbols).toEqual([3, 0, 0, 0]);
    expect(second.symbols).toEqual([3, 0, 0, 4]);
  });

  it('skips cells outside the chart', () => {
    expect(setSymbols(chart, [[5, 5]], 3)).toBe(chart);
  });

  it('returns the same chart when nothing changes', () => {
    const first = setSymbols(chart, [[0, 0]], 3);

    expect(setSymbols(first, [[0, 0]], 3)).toBe(first);
  });

  it('does not create a layer just to clear a cell', () => {
    expect(setSymbols(chart, [[0, 0]], 0)).toBe(chart);
  });
});

describe('usedSymbols', () => {
  it('counts the symbols of a chart', () => {
    const id = SYMBOLS[0]?.id ?? 0;
    const pattern: Pattern = { ...createPattern(3, 1), symbols: [id, id, 0] };

    expect(usedSymbols(pattern)).toEqual([{ symbol: SYMBOLS[0], count: 2 }]);
  });

  it('is empty without a symbol layer', () => {
    expect(usedSymbols(createPattern(1, 1))).toEqual([]);
  });

  it('skips ids it does not know', () => {
    expect(usedSymbols({ ...createPattern(1, 1), symbols: [9999] })).toEqual([]);
  });
});

describe('symbolInk', () => {
  const pattern: Pattern = {
    ...createPattern(3, 1, 'knitting'),
    palette: ['#000000', '#ffffff'],
    cells: [1, 2, 0],
  };

  it('is light on a dark stitch', () => {
    expect(symbolInk(pattern, 0)).toBe('#ffffff');
  });

  it('is dark on a light stitch', () => {
    expect(symbolInk(pattern, 1)).toBe('#000000');
  });

  it('is dark on an empty cell', () => {
    expect(symbolInk(pattern, 2)).toBe('#000000');
  });
});

describe('contrastColor', () => {
  it('uses dark ink on light cells', () => {
    expect(contrastColor('#ffffff')).toBe('#000000');
    expect(contrastColor('#ffee88')).toBe('#000000');
  });

  it('uses light ink on dark cells', () => {
    expect(contrastColor('#000000')).toBe('#ffffff');
    expect(contrastColor('#23222a')).toBe('#ffffff');
  });
});
