import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createPattern } from '../domain/pattern';
import { StitchSymbol } from '../domain/symbols';
import { PatternApi } from './pattern-api';

describe('PatternApi', () => {
  let api: PatternApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PatternApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists a page of patterns', async () => {
    const page = { items: [], total: 0, page: 2, size: 50 };

    const listed = api.list(2);
    const request = http.expectOne('/api/patterns?page=2&size=50');
    request.flush(page);

    expect(await listed).toEqual(page);
  });

  it('creates a pattern from its fields', async () => {
    const pattern = createPattern(1, 1, 'crossStitch', 'Rose');

    const created = api.create(pattern);
    const request = http.expectOne('/api/patterns');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      title: 'Rose',
      craftType: 'crossStitch',
      width: 1,
      height: 1,
      palette: pattern.palette,
      cells: [0],
    });
    request.flush({ ...pattern, id: 'a', version: 0 });

    expect((await created).id).toBe('a');
  });

  it('saves a pattern with the version it was loaded in', async () => {
    const saved = api.save('a', createPattern(1, 1), 7);
    const request = http.expectOne('/api/patterns/a');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ version: 7 });
    request.flush({ version: 8 });

    expect((await saved).version).toBe(8);
  });

  it('loads one pattern', async () => {
    const loaded = api.get('a');
    http.expectOne('/api/patterns/a').flush({ id: 'a' });

    expect((await loaded).id).toBe('a');
  });

  it('turns a missing symbol layer into a field that does not exist', async () => {
    const loaded = api.get('a');
    http.expectOne('/api/patterns/a').flush({ id: 'a', symbols: null });

    expect(await loaded).not.toHaveProperty('symbols');
  });

  it('drops an empty list of custom stitches', async () => {
    const loaded = api.get('a');
    http.expectOne('/api/patterns/a').flush({ id: 'a', customStitches: [] });

    expect(await loaded).not.toHaveProperty('customStitches');
  });

  it('sends the custom stitches of a chart', async () => {
    const stitch: StitchSymbol = {
      id: 1000,
      name: 'B',
      abbreviation: 'b',
      lines: [],
      circles: [[0, 0, 0]],
    };
    const pattern = { ...createPattern(1, 1), customStitches: [stitch] };

    const created = api.create(pattern);
    const request = http.expectOne('/api/patterns');
    expect(request.request.body).toMatchObject({ customStitches: [stitch] });
    request.flush({ id: 'a' });
    await created;
  });

  it('turns missing gauge settings into a field that does not exist', async () => {
    const loaded = api.get('a');
    http.expectOne('/api/patterns/a').flush({ id: 'a', gauge: null });

    expect(await loaded).not.toHaveProperty('gauge');
  });

  it('sends the gauge of a chart', async () => {
    const gauge = { stitchesPerUnit: 22, rowsPerUnit: 30, unit: 'cm10' as const };

    const created = api.create({ ...createPattern(1, 1), gauge });
    const request = http.expectOne('/api/patterns');
    expect(request.request.body).toMatchObject({ gauge });
    request.flush({ id: 'a' });
    await created;
  });

  it('keeps a symbol layer', async () => {
    const loaded = api.get('a');
    http.expectOne('/api/patterns/a').flush({ id: 'a', symbols: [1, 2] });

    expect((await loaded).symbols).toEqual([1, 2]);
  });

  it('keeps an id from the address inside its path segment', async () => {
    const loaded = api.get('../users?x=1');
    http.expectOne('/api/patterns/..%2Fusers%3Fx%3D1').flush({ id: 'a' });

    await loaded;
  });

  it('loads the progress of a chart', async () => {
    const progress = { doneRows: [1], doneCells: [], currentRow: 2 };

    const loaded = api.getProgress('a');
    http.expectOne('/api/patterns/a/progress').flush(progress);

    expect(await loaded).toEqual(progress);
  });

  it('saves the progress of a chart', async () => {
    const progress = { doneRows: [1], doneCells: [], currentRow: 2 };

    const saved = api.saveProgress('a', progress);
    const request = http.expectOne('/api/patterns/a/progress');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(progress);
    request.flush(progress);
    await saved;
  });

  it('asks for the link of a chart', async () => {
    const status = api.shareStatus('a');
    http.expectOne('/api/patterns/a/share').flush({ slug: null });

    expect(await status).toEqual({ slug: null });
  });

  it('creates and revokes a link', async () => {
    const created = api.share('a');
    const create = http.expectOne('/api/patterns/a/share');
    expect(create.request.method).toBe('POST');
    create.flush({ slug: 'abc' });
    expect((await created).slug).toBe('abc');

    const revoked = api.revokeShare('a');
    const revoke = http.expectOne('/api/patterns/a/share');
    expect(revoke.request.method).toBe('DELETE');
    revoke.flush(null, { status: 204, statusText: 'No Content' });
    await revoked;
  });

  it('reads a shared chart and keeps the slug in its path segment', async () => {
    const read = api.readShared('a/b');
    http.expectOne('/api/share/a%2Fb').flush({ title: 'Rose', symbols: null, customStitches: [] });

    expect(await read).toEqual({ title: 'Rose' });
  });

  it('deletes a pattern', async () => {
    const deleted = api.remove('a');
    const request = http.expectOne('/api/patterns/a');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await deleted;
  });
});
