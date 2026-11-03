import { Injectable } from '@angular/core';
import { Crop, cropRect } from '../../domain/image-quantize';
import type { ConvertRequest } from './image.worker';

/** An image that was read from a file. */
export interface LoadedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export interface ConvertOptions {
  crop: Crop;
  width: number;
  height: number;
  colors: number;
}

export interface ConvertResult {
  cells: number[];
  palette: string[];
}

/** The largest image file that is read. */
const MAX_FILE_BYTES = 32 * 1024 * 1024;

/** Longer image sides are scaled down first, which is plenty for any chart and saves memory. */
const MAX_SOURCE_SIDE = 2048;

/**
 * Reads image files and turns them into charts. All of it stays in the browser, and the expensive
 * part runs in a worker so that the page stays responsive.
 */
@Injectable({ providedIn: 'root' })
export class ImageConverter {
  private worker: Worker | null = null;
  private nextId = 0;
  private readonly running = new Map<
    number,
    { resolve: (result: ConvertResult) => void; reject: (error: Error) => void }
  >();

  /** Reads a file. A file that is no readable image gives a message for the user. */
  async load(file: File): Promise<LoadedImage> {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      throw new Error('Please choose a photo or picture file.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('This file is too large.');
    }
    try {
      const bitmap = await createImageBitmap(file);
      return { bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      throw new Error('This file could not be read as an image.');
    }
  }

  convert(image: LoadedImage, options: ConvertOptions): Promise<ConvertResult> {
    const rect = cropRect(image.width, image.height, options.crop);
    const scale = Math.min(1, MAX_SOURCE_SIDE / Math.max(rect.width, rect.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return Promise.reject(new Error('The browser cannot read this image.'));
    }
    context.drawImage(
      image.bitmap,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    return this.run({
      id: this.nextId++,
      pixels: data,
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
      width: options.width,
      height: options.height,
      colors: options.colors,
    });
  }

  /** Answers come back by their id, because a newer conversion can overtake an older one. */
  private run(request: ConvertRequest): Promise<ConvertResult> {
    const worker = (this.worker ??= this.createWorker());
    return new Promise((resolve, reject) => {
      this.running.set(request.id, { resolve, reject });
      worker.postMessage(request, [request.pixels.buffer]);
    });
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./image.worker', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<ConvertResult & { id: number }>) => {
      const { id, cells, palette } = data;
      this.running.get(id)?.resolve({ cells, palette });
      this.running.delete(id);
    };
    worker.onerror = () => {
      for (const { reject } of this.running.values()) {
        reject(new Error('The image could not be converted.'));
      }
      this.running.clear();
    };
    return worker;
  }
}
