/** The ways gauge is usually given: per centimetre, 10 cm, inch or 4 inches. */
export type GaugeUnit = 'cm' | 'cm10' | 'in' | 'in4';

/** The gauge a chart is worked in: stitches and rows per unit. */
export interface Gauge {
  stitchesPerUnit: number;
  rowsPerUnit: number;
  unit: GaugeUnit;
}

const CM_PER_INCH = 2.54;

const UNIT_IN_CM: Readonly<Record<GaugeUnit, number>> = {
  cm: 1,
  cm10: 10,
  in: CM_PER_INCH,
  in4: 4 * CM_PER_INCH,
};

/** A count per unit as a count per centimetre. */
export function perCentimetre(count: number, unit: GaugeUnit): number {
  return count / UNIT_IN_CM[unit];
}

/** The size of a chart when it is worked in a gauge. */
export function finishedSize(
  stitches: number,
  rows: number,
  gauge: Gauge,
): { widthCm: number; heightCm: number; widthIn: number; heightIn: number } {
  const widthCm = stitches / perCentimetre(gauge.stitchesPerUnit, gauge.unit);
  const heightCm = rows / perCentimetre(gauge.rowsPerUnit, gauge.unit);
  return {
    widthCm,
    heightCm,
    widthIn: widthCm / CM_PER_INCH,
    heightIn: heightCm / CM_PER_INCH,
  };
}

/** The stitches and rows a wanted size takes, rounded up so that the result is not too small. */
export function requiredStitches(
  width: number,
  height: number,
  unit: 'cm' | 'in',
  gauge: Gauge,
): { stitches: number; rows: number } {
  const factor = unit === 'in' ? CM_PER_INCH : 1;
  return {
    stitches: Math.ceil(width * factor * perCentimetre(gauge.stitchesPerUnit, gauge.unit) - 1e-9),
    rows: Math.ceil(height * factor * perCentimetre(gauge.rowsPerUnit, gauge.unit) - 1e-9),
  };
}

/**
 * The size of a cross stitch chart on fabric. `count` is the thread count per inch, as in 14-count
 * Aida; on evenweave a stitch usually goes over two threads. The margin is added on every side of
 * the fabric to cut.
 */
export function sizeOnFabric(
  stitches: number,
  rows: number,
  count: number,
  marginCm = 0,
  threadsPerStitch = 1,
): {
  widthIn: number;
  heightIn: number;
  widthCm: number;
  heightCm: number;
  fabricWidthCm: number;
  fabricHeightCm: number;
} {
  const stitchesPerInch = count / threadsPerStitch;
  const widthIn = stitches / stitchesPerInch;
  const heightIn = rows / stitchesPerInch;
  const widthCm = widthIn * CM_PER_INCH;
  const heightCm = heightIn * CM_PER_INCH;
  return {
    widthIn,
    heightIn,
    widthCm,
    heightCm,
    fabricWidthCm: widthCm + 2 * marginCm,
    fabricHeightCm: heightCm + 2 * marginCm,
  };
}
