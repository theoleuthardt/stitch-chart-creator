import { fileName } from './download';

describe('fileName', () => {
  it('turns a title into a safe file name', () => {
    expect(fileName('Red Rose', 'png')).toBe('red-rose.png');
  });

  it('removes characters that are not safe in file names', () => {
    expect(fileName('../a/b: c?', 'json')).toBe('a-b-c.json');
  });

  it('keeps letters of other languages', () => {
    expect(fileName('Blüte', 'pdf')).toBe('blüte.pdf');
  });

  it('has a fallback for titles without usable characters', () => {
    expect(fileName('???', 'svg')).toBe('chart.svg');
  });
});
