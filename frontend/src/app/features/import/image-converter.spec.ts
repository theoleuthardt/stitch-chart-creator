import { TestBed } from '@angular/core/testing';
import { ImageConverter, LoadedImage } from './image-converter';

class FakeWorker {
  static latest: FakeWorker;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  requests: { id: number; colors: number }[] = [];

  constructor() {
    FakeWorker.latest = this;
  }

  postMessage(request: { id: number; colors: number }) {
    this.requests.push(request);
  }

  answer(index: number, palette: string[]) {
    const { id } = this.requests[index] as { id: number };
    this.onmessage?.({ data: { id, cells: [], palette } } as unknown as MessageEvent);
  }
}

const image = { bitmap: {}, width: 4, height: 4 } as LoadedImage;
const options = {
  crop: { left: 0, top: 0, right: 0, bottom: 0 },
  width: 2,
  height: 2,
};

describe('ImageConverter', () => {
  let converter: ImageConverter;

  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: () => undefined,
      getImageData: () => ({ data: new Uint8ClampedArray(64) }),
    } as unknown as CanvasRenderingContext2D);
    converter = TestBed.inject(ImageConverter);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const file = (type: string, size = 1) => new File([new Uint8Array(size)], 'file', { type });

  it('refuses what is no picture', async () => {
    await expect(converter.load(file('text/plain'))).rejects.toThrow('photo or picture');
  });

  it('refuses SVG, which could carry scripts', async () => {
    await expect(converter.load(file('image/svg+xml'))).rejects.toThrow('photo or picture');
  });

  it('refuses a huge file before reading it', async () => {
    const huge = new File([], 'huge', { type: 'image/png' });
    Object.defineProperty(huge, 'size', { value: 40 * 1024 * 1024 });

    await expect(converter.load(huge)).rejects.toThrow('too large');
  });

  it('explains a file that cannot be decoded', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('broken')));

    await expect(converter.load(file('image/png'))).rejects.toThrow('could not be read');
  });

  it('matches every answer of the worker to its own request', async () => {
    const first = converter.convert(image, { ...options, colors: 16 });
    const second = converter.convert(image, { ...options, colors: 4 });
    const worker = FakeWorker.latest;

    worker.answer(1, ['#000004']);
    worker.answer(0, ['#000016']);

    expect((await first).palette).toEqual(['#000016']);
    expect((await second).palette).toEqual(['#000004']);
  });

  it('starts a new worker after one broke', async () => {
    const running = converter.convert(image, { ...options, colors: 16 });
    const broken = FakeWorker.latest;
    broken.onerror?.(new ErrorEvent('error'));
    await expect(running).rejects.toThrow();

    const next = converter.convert(image, { ...options, colors: 8 });
    FakeWorker.latest.answer(0, ['#000000']);

    expect(FakeWorker.latest).not.toBe(broken);
    expect((await next).palette).toEqual(['#000000']);
  });

  it('fails all running conversions when the worker breaks', async () => {
    const running = converter.convert(image, { ...options, colors: 16 });

    FakeWorker.latest.onerror?.(new ErrorEvent('error'));

    await expect(running).rejects.toThrow('could not be converted');
  });
});
