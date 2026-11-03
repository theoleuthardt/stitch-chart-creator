import { createPattern, Pattern } from './pattern';
import {
  cellAspect,
  contrastColor,
  setSymbols,
  symbolById,
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
