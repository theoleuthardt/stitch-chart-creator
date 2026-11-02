import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createPattern } from '../domain/pattern';
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

  it('keeps a symbol layer', async () => {
    const loaded = api.get('a');
    http.expectOne('/api/patterns/a').flush({ id: 'a', symbols: [1, 2] });

    expect((await loaded).symbols).toEqual([1, 2]);
  });

  it('deletes a pattern', async () => {
    const deleted = api.remove('a');
    const request = http.expectOne('/api/patterns/a');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await deleted;
  });
});
