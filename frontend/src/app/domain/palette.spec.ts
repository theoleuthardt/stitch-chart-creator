import { addColor, changeColor, isHexColor, mergeColors, removeColor } from './palette';
import { createPattern, Pattern } from './pattern';

const chart = (cells: number[]): Pattern => ({
  ...createPattern(cells.length, 1),
  palette: ['#ff0000', '#00ff00', '#0000ff'],
  cells,
});

describe('isHexColor', () => {
  it('accepts six hex digits', () => {
    expect(isHexColor('#a1B2c3')).toBe(true);
  });

  it('refuses anything else', () => {
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#gggggg')).toBe(false);
  });
});

describe('addColor', () => {
  it('appends a colour and leaves the cells alone', () => {
    const changed = addColor(chart([1]), '#ffffff');

    expect(changed.palette).toHaveLength(4);
    expect(changed.palette[3]).toBe('#ffffff');
    expect(changed.cells).toEqual([1]);
  });

  it('does not change the original', () => {
    const pattern = chart([1]);

    addColor(pattern, '#ffffff');

    expect(pattern.palette).toHaveLength(3);
  });
});

describe('changeColor', () => {
  it('replaces one entry', () => {
    expect(changeColor(chart([1]), 2, '#123456').palette).toEqual([
      '#ff0000',
      '#123456',
      '#0000ff',
    ]);
  });

  it('returns the same chart when nothing changes', () => {
    const pattern = chart([1]);

    expect(changeColor(pattern, 1, '#ff0000')).toBe(pattern);
  });
});

describe('removeColor', () => {
  it('clears the cells of the removed colour', () => {
    expect(removeColor(chart([1, 2, 3]), 2, 0).cells).toEqual([1, 0, 2]);
  });

  it('moves later colours down one place', () => {
    const changed = removeColor(chart([3]), 1, 0);

    expect(changed.palette).toEqual(['#00ff00', '#0000ff']);
    expect(changed.cells).toEqual([2]);
  });

  it('can replace the cells with another colour', () => {
    const changed = removeColor(chart([1, 2, 3]), 1, 3);

    expect(changed.palette).toEqual(['#00ff00', '#0000ff']);
    expect(changed.cells).toEqual([2, 1, 2]);
  });

  it('replaces with an earlier colour too', () => {
    expect(removeColor(chart([1, 2, 3]), 3, 1).cells).toEqual([1, 2, 1]);
  });

  it('keeps empty cells empty', () => {
    expect(removeColor(chart([0, 1]), 1, 2).cells).toEqual([0, 1]);
  });
});

describe('mergeColors', () => {
  it('moves the cells of one colour to another and drops it', () => {
    const changed = mergeColors(chart([1, 2, 3]), 3, 1);

    expect(changed.cells).toEqual([1, 2, 1]);
    expect(changed.palette).toEqual(['#ff0000', '#00ff00']);
  });

  it('returns the same chart when both are the same colour', () => {
    const pattern = chart([1]);

    expect(mergeColors(pattern, 1, 1)).toBe(pattern);
  });
});
