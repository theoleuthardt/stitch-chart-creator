/// <reference lib="webworker" />

import { downsample, quantize } from '../../domain/image-quantize';

/** What the converter sends. The id comes back with the answer. */
export interface ConvertRequest {
  id: number;
  pixels: Uint8ClampedArray;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
  colors: number;
}

addEventListener('message', ({ data }: MessageEvent<ConvertRequest>) => {
  const { id, pixels, sourceWidth, sourceHeight, width, height, colors } = data;
  postMessage({
    id,
    ...quantize(downsample(pixels, sourceWidth, sourceHeight, width, height), colors),
  });
});
