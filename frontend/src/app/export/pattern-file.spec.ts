import { createPattern, Pattern } from '../domain/pattern';
import { parsePatternFile, serializePattern } from './pattern-file';

const pattern: Pattern = {
  ...createPattern(2, 2, 'knitting', 'Scarf'),
  palette: ['#ff0000', '#00ff00'],
  cells: [0, 1, 2, 0],
  symbols: [1, 0, 0, 2],
};

const file = (changes: Record<string, unknown>) =>
  JSON.stringify({ ...JSON.parse(serializePattern(pattern)), ...changes });

const rejected = (text: string) => {
  const result = parsePatternFile(text);
  if (result.ok) {
    throw new Error('expected a rejection');
  }
  return result.error;
};

describe('serializePattern', () => {
  it('writes a format version and the fields of the chart', () => {
    const data = JSON.parse(serializePattern(pattern)) as Record<string, unknown>;

    expect(data['format']).toBe('stitch-chart');
    expect(data['version']).toBe(1);
    expect(data['title']).toBe('Scarf');
    expect(data['cells']).toEqual([0, 1, 2, 0]);
  });

  it('writes nothing that only the server knows', () => {
    const stored = { ...pattern, id: 'a', thumbnail: 'x' } as Pattern;

    expect(serializePattern(stored)).not.toContain('thumbnail');
    expect(JSON.parse(serializePattern(stored))).not.toHaveProperty('id');
  });
});

describe('parsePatternFile', () => {
  it('reads back what was written', () => {
    expect(parsePatternFile(serializePattern(pattern))).toEqual({ ok: true, pattern });
  });

  it('reads a chart without symbols', () => {
    const plain = { ...pattern };
    delete plain.symbols;

    const result = parsePatternFile(serializePattern(plain));

    expect(result.ok && result.pattern.symbols).toBeUndefined();
  });

  it('ignores unknown fields', () => {
    const result = parsePatternFile(file({ __proto__evil: 1, ownerId: 'x' }));

    expect(result.ok && Object.keys(result.pattern)).not.toContain('ownerId');
  });

  it('rejects text that is not JSON', () => {
    expect(rejected('not json')).toBe('This is not a chart file.');
  });

  it('rejects JSON of another shape', () => {
    expect(rejected('[]')).toBe('This is not a chart file.');
    expect(rejected('null')).toBe('This is not a chart file.');
    expect(rejected('{"hello":"world"}')).toBe('This is not a chart file.');
  });

  it('rejects a newer format', () => {
    expect(rejected(file({ version: 2 }))).toBe('This file needs a newer version of the app.');
  });

  it('rejects an empty or too long title', () => {
    expect(rejected(file({ title: '  ' }))).toContain('title');
    expect(rejected(file({ title: 'x'.repeat(201) }))).toContain('title');
    expect(rejected(file({ title: 7 }))).toContain('title');
  });

  it('rejects an unknown craft', () => {
    expect(rejected(file({ craftType: 'painting' }))).toContain('craft');
  });

  it('rejects impossible sizes', () => {
    expect(rejected(file({ width: 0 }))).toContain('size');
    expect(rejected(file({ height: -1 }))).toContain('size');
    expect(rejected(file({ width: 1.5 }))).toContain('size');
    expect(rejected(file({ width: '2' }))).toContain('size');
    expect(rejected(file({ width: 1e9, height: 1e9 }))).toContain('size');
  });

  it('rejects a palette that is not colours', () => {
    expect(rejected(file({ palette: 'red' }))).toContain('colour');
    expect(rejected(file({ palette: ['red', '#00ff00'] }))).toContain('colour');
    expect(rejected(file({ palette: ['<script>alert(1)</script>', '#00ff00'] }))).toContain(
      'colour',
    );
  });

  it('rejects cells that do not match the chart', () => {
    expect(rejected(file({ cells: [0, 1, 2] }))).toContain('cells');
    expect(rejected(file({ cells: 'abc' }))).toContain('cells');
    expect(rejected(file({ cells: [0, 1, 2, 3] }))).toContain('cells');
    expect(rejected(file({ cells: [0, 1, 2, -1] }))).toContain('cells');
    expect(rejected(file({ cells: [0, 1, 2, 0.5] }))).toContain('cells');
    expect(rejected(file({ cells: [0, 1, 2, '1'] }))).toContain('cells');
    expect(rejected(file({ cells: [0, 1, 2, null] }))).toContain('cells');
  });

  it('rejects symbols that do not match the chart', () => {
    expect(rejected(file({ symbols: [1] }))).toContain('symbols');
    expect(rejected(file({ symbols: [1, 0, 0, -2] }))).toContain('symbols');
    expect(rejected(file({ symbols: 'x' }))).toContain('symbols');
  });

  it('does not let a crafted file touch object prototypes', () => {
    parsePatternFile('{"__proto__":{"polluted":true},"format":"stitch-chart"}');

    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});
