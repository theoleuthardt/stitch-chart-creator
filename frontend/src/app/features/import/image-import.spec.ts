import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PatternApi } from '../../api/pattern-api';
import { ImageConverter, LoadedImage } from './image-converter';
import { ImageImport } from './image-import';

const image = { bitmap: {}, width: 800, height: 600 } as LoadedImage;
const file = new File(['x'], 'Red Rose.png', { type: 'image/png' });

describe('ImageImport', () => {
  const setup = async () => {
    const converter = {
      load: vi.fn(() => Promise.resolve(image)),
      convert: vi.fn(() =>
        Promise.resolve({ cells: [1, 0, 2, 1], palette: ['#ff0000', '#00ff00'] }),
      ),
    };
    const api = { create: vi.fn(() => Promise.resolve({ id: 'new' })) };
    TestBed.configureTestingModule({
      imports: [ImageImport],
      providers: [
        provideRouter([]),
        { provide: ImageConverter, useValue: converter },
        { provide: PatternApi, useValue: api },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ImageImport);
    await fixture.whenStable();
    return { fixture, converter, api, navigate, importer: fixture.componentInstance };
  };

  it('offers nothing to save before an image was chosen', async () => {
    const { importer } = await setup();

    expect(importer.result()).toBeNull();
  });

  it('converts a chosen image with proportions that fit', async () => {
    const { importer, converter } = await setup();
    importer.width.set(40);

    await importer.choose(file);

    expect(converter.convert).toHaveBeenCalledWith(
      image,
      expect.objectContaining({ width: 40, height: 30, colors: 16 }),
    );
    expect(importer.result()?.palette).toHaveLength(2);
  });

  it('takes the title from the file name', async () => {
    const { importer } = await setup();

    await importer.choose(file);

    expect(importer.title()).toBe('Red Rose');
  });

  it('converts again when the settings change', async () => {
    const { importer, converter } = await setup();
    await importer.choose(file);
    converter.convert.mockClear();

    await importer.update({ colors: 4 });

    expect(converter.convert).toHaveBeenCalledWith(image, expect.objectContaining({ colors: 4 }));
  });

  it('shows only the result of the latest settings', async () => {
    const { importer, converter } = await setup();
    await importer.choose(file);
    let finishFirst: (value: { cells: number[]; palette: string[] }) => void = () => undefined;
    converter.convert.mockImplementationOnce(
      () => new Promise((resolve) => (finishFirst = resolve)),
    );
    converter.convert.mockImplementationOnce(() =>
      Promise.resolve({ cells: [1], palette: ['#000000'] }),
    );

    const slow = importer.update({ colors: 4 });
    await importer.update({ colors: 8 });
    finishFirst({ cells: [2], palette: ['#ffffff', '#111111'] });
    await slow;

    expect(importer.result()?.palette).toEqual(['#000000']);
  });

  it('saves the size the cells were made for, not one changed since', async () => {
    const { importer, api, converter } = await setup();
    importer.width.set(2);
    await importer.choose(file);
    let finish: (value: { cells: number[]; palette: string[] }) => void = () => undefined;
    converter.convert.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));

    const running = importer.update({ width: 4 });
    expect(importer.canSave()).toBe(false);
    await importer.save();
    expect(api.create).not.toHaveBeenCalled();

    finish({ cells: new Array<number>(12).fill(1), palette: ['#000000'] });
    await running;
    expect(importer.canSave()).toBe(true);
  });

  it('stays unsaveable after a failed conversion', async () => {
    const { importer, converter } = await setup();
    await importer.choose(file);
    converter.convert.mockRejectedValueOnce(new Error('failed'));

    await importer.update({ width: 80 });

    expect(importer.canSave()).toBe(false);
    expect(importer.error()).toBe('failed');
  });

  it('keeps the settings inside their limits', async () => {
    const { importer } = await setup();
    await importer.choose(file);

    await importer.update({ width: 100_000 });
    await importer.update({ colors: 5000 });
    await importer.setCrop('left', 200);

    expect(importer.width()).toBe(1000);
    expect(importer.colors()).toBe(256);
    expect(importer.crop().left).toBe(95);
  });

  it('refuses a very tall image that would give too many stitches', async () => {
    const { importer, converter } = await setup();
    converter.load.mockResolvedValueOnce({ bitmap: {}, width: 1, height: 100_000 } as LoadedImage);
    importer.width.set(1000);
    converter.convert.mockClear();

    await importer.choose(file);

    expect(converter.convert).not.toHaveBeenCalled();
    expect(importer.error()).toContain('too large');
  });

  it('keeps the file that was chosen last', async () => {
    const { importer, converter } = await setup();
    let finishFirst: (value: LoadedImage) => void = () => undefined;
    converter.load.mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)));
    const second = { ...image, width: 400 };
    converter.load.mockResolvedValueOnce(second);

    const first = importer.choose(file);
    await importer.choose(new File(['y'], 'Second.png', { type: 'image/png' }));
    finishFirst(image);
    await first;

    expect(importer.image()).toBe(second);
    expect(importer.title()).toBe('Second');
  });

  it('explains why a file was refused', async () => {
    const { importer, converter } = await setup();
    converter.load.mockRejectedValueOnce(new Error('This file is too large.'));

    await importer.choose(file);

    expect(importer.error()).toBe('This file is too large.');
    expect(importer.result()).toBeNull();
  });

  it('stores the result as a new chart and opens it', async () => {
    const { importer, api, navigate } = await setup();
    importer.width.set(2);
    await importer.choose(file);

    await importer.save();

    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Red Rose',
        width: 2,
        palette: ['#ff0000', '#00ff00'],
        cells: [1, 0, 2, 1],
      }),
    );
    expect(navigate).toHaveBeenCalledWith('/charts/new');
  });
});
