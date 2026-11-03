import { finishedSize, Gauge, perCentimetre, requiredStitches, sizeOnFabric } from './gauge';

const tenCm: Gauge = { stitchesPerUnit: 20, rowsPerUnit: 30, unit: 'cm10' };

describe('perCentimetre', () => {
  it('converts every unit', () => {
    expect(perCentimetre(20, 'cm')).toBe(20);
    expect(perCentimetre(20, 'cm10')).toBe(2);
    expect(perCentimetre(25.4, 'in')).toBeCloseTo(10);
    expect(perCentimetre(101.6, 'in4')).toBeCloseTo(10);
  });
});

describe('finishedSize', () => {
  it('works out the size of a chart', () => {
    const size = finishedSize(100, 60, tenCm);

    expect(size.widthCm).toBe(50);
    expect(size.heightCm).toBe(20);
  });

  it('gives inches too', () => {
    expect(finishedSize(127, 1, { ...tenCm, unit: 'in', stitchesPerUnit: 10 }).widthIn).toBeCloseTo(
      12.7,
    );
  });

  it('answers the same in any unit', () => {
    const metric = finishedSize(100, 100, { stitchesPerUnit: 4, rowsPerUnit: 5, unit: 'cm' });
    const imperial = finishedSize(100, 100, {
      stitchesPerUnit: 10.16,
      rowsPerUnit: 12.7,
      unit: 'in',
    });

    expect(imperial.widthCm).toBeCloseTo(metric.widthCm);
    expect(imperial.heightCm).toBeCloseTo(metric.heightCm);
  });
});

describe('requiredStitches', () => {
  it('works out the stitches for a wanted size', () => {
    expect(requiredStitches(50, 20, 'cm', tenCm)).toEqual({ stitches: 100, rows: 60 });
  });

  it('accepts inches', () => {
    expect(
      requiredStitches(10, 10, 'in', { ...tenCm, unit: 'in', stitchesPerUnit: 4, rowsPerUnit: 6 }),
    ).toEqual({
      stitches: 40,
      rows: 60,
    });
  });

  it('rounds up, so that the result is not too small', () => {
    expect(
      requiredStitches(5.1, 5.1, 'cm', {
        ...tenCm,
        unit: 'cm',
        stitchesPerUnit: 1,
        rowsPerUnit: 1,
      }),
    ).toEqual({
      stitches: 6,
      rows: 6,
    });
  });
});

describe('sizeOnFabric', () => {
  it('works out the size on Aida', () => {
    const size = sizeOnFabric(140, 70, 14);

    expect(size.widthIn).toBeCloseTo(10);
    expect(size.heightIn).toBeCloseTo(5);
    expect(size.widthCm).toBeCloseTo(25.4);
  });

  it('adds the margin to the fabric to cut', () => {
    const size = sizeOnFabric(140, 70, 14, 5);

    expect(size.fabricWidthCm).toBeCloseTo(35.4);
    expect(size.fabricHeightCm).toBeCloseTo(22.7);
  });

  it('counts over two threads on evenweave', () => {
    expect(sizeOnFabric(140, 70, 28, 0, 2).widthIn).toBeCloseTo(10);
  });
});
