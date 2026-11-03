import { unzipSync } from 'fflate';
import writeExcelFile from 'write-excel-file/universal';
import { createPattern, Pattern } from '../domain/pattern';
import { excelSheets, fitsExcel } from './to-xlsx';

const pattern: Pattern = {
  ...createPattern(2, 2, 'crossStitch', 'Rose'),
  palette: ['#ff0000', '#00ff00'],
  cells: [1, 0, 2, 1],
};

const blobBytes = (blob: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });

const unpack = async () => {
  const blob = await writeExcelFile(excelSheets(pattern)).toBlob();
  const files = unzipSync(await blobBytes(blob));
  const read = (name: string) => new TextDecoder().decode(files[name]);
  return { files, read };
};

describe('excelSheets', () => {
  it('has a sheet for the chart and one for the legend', () => {
    expect(excelSheets(pattern).map((sheet) => sheet.sheet)).toEqual(['Chart', 'Legend']);
  });

  it('makes one coloured cell per stitch and leaves empty stitches empty', () => {
    const chart = excelSheets(pattern)[0]?.data;

    expect(chart).toHaveLength(2);
    expect(chart?.[0]?.[0]).toMatchObject({ backgroundColor: '#ff0000' });
    expect(chart?.[0]?.[1]).toBeNull();
    expect(chart?.[1]?.[0]).toMatchObject({ backgroundColor: '#00ff00' });
  });

  it('writes the abbreviation of a symbol into its cell', () => {
    const knitted = { ...createPattern(2, 1, 'knitting'), symbols: [1, 0] };

    expect(excelSheets(knitted)[0]?.data[0]?.[0]).toMatchObject({ value: 'k' });
    expect(excelSheets(knitted)[0]?.data[0]?.[1]).toBeNull();
  });

  it('keeps the abbreviation readable on a dark cell', () => {
    const knitted = {
      ...createPattern(1, 1, 'knitting'),
      palette: ['#000000'],
      cells: [1],
      symbols: [1],
    };

    expect(excelSheets(knitted)[0]?.data[0]?.[0]).toMatchObject({ textColor: '#ffffff' });
  });

  it('lists the symbols in the legend', () => {
    const knitted = { ...createPattern(2, 1, 'knitting'), symbols: [1, 1] };

    const rows = excelSheets(knitted)[1]?.data;

    expect(rows?.at(-1)?.[1]).toMatchObject({ value: 'k' });
    expect(rows?.at(-1)?.[2]).toMatchObject({ value: 2 });
  });

  it('makes the cells square', () => {
    const [chart] = excelSheets(pattern);

    expect(chart?.columns).toHaveLength(2);
    expect(chart?.columns?.[0]?.width).toBeLessThan(4);
  });

  it('lists the used colours with their stitch counts', () => {
    const legend = excelSheets(pattern)[1]?.data;

    expect(legend).toHaveLength(3);
    expect(legend?.[1]?.[1]).toMatchObject({ value: '#ff0000' });
    expect(legend?.[1]?.[2]).toMatchObject({ value: 2 });
  });
});

describe('the written file', () => {
  it('is a real workbook with both sheets', async () => {
    const { files, read } = await unpack();

    expect(Object.keys(files)).toContain('xl/worksheets/sheet1.xml');
    expect(Object.keys(files)).toContain('xl/worksheets/sheet2.xml');
    expect(read('xl/workbook.xml')).toContain('name="Chart"');
    expect(read('xl/workbook.xml')).toContain('name="Legend"');
  });

  it('contains the colours of the chart', async () => {
    const { read } = await unpack();
    const styles = read('xl/styles.xml').toLowerCase();

    expect(styles).toContain('ff0000');
    expect(styles).toContain('00ff00');
  });
});

describe('fitsExcel', () => {
  it('accepts what a worksheet can hold', () => {
    expect(fitsExcel(createPattern(100, 100))).toBe(true);
  });

  it('refuses more columns than a worksheet has', () => {
    expect(fitsExcel({ ...pattern, width: 20_000 })).toBe(false);
  });

  it('refuses more rows than a worksheet has', () => {
    expect(fitsExcel({ ...pattern, height: 2_000_000 })).toBe(false);
  });
});
