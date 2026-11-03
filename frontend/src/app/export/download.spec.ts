import { downloadFile, fileName } from './download';

describe('downloadFile', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps the file available until the browser has taken it', () => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadFile('a.txt', new Blob(['a']));
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});

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
