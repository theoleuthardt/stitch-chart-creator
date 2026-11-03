import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StitchApi } from './stitch-api';

describe('StitchApi', () => {
  let api: StitchApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(StitchApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the stitches of the account', async () => {
    const listed = api.list();
    http.expectOne('/api/stitches').flush([{ id: 's1' }]);

    expect(await listed).toEqual([{ id: 's1' }]);
  });

  it('creates a stitch', async () => {
    const drawing = { name: 'B', abbreviation: 'b', lines: [], circles: [[0, 0, 0]] as const };

    const created = api.create(drawing);
    const request = http.expectOne('/api/stitches');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(drawing);
    request.flush({ ...drawing, id: 's1' });

    expect((await created).id).toBe('s1');
  });

  it('deletes a stitch', async () => {
    const removed = api.remove('s/1');
    const request = http.expectOne('/api/stitches/s%2F1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await removed;
  });
});
