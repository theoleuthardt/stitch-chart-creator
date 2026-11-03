import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PatternApi } from '../../api/pattern-api';
import { createPattern } from '../../domain/pattern';
import { EMPTY_PROGRESS } from '../../domain/progress';
import { SAVE_DELAY, Work } from './work';

class FakeResizeObserver {
  observe = () => undefined;
  disconnect = () => undefined;
}

const chart = { ...createPattern(2, 3, 'crossStitch', 'Rose'), id: 'a', version: 1 };
chart.cells = [1, 1, 1, 1, 1, 1];

describe('Work', () => {
  const setup = async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const api = {
      get: vi.fn(() => Promise.resolve(chart)),
      getProgress: vi.fn(() => Promise.resolve(EMPTY_PROGRESS)),
      saveProgress: vi.fn(() => Promise.resolve()),
    };
    TestBed.configureTestingModule({
      imports: [Work],
      providers: [
        provideRouter([]),
        { provide: PatternApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'a' }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(Work);
    await fixture.whenStable();
    return { fixture, api, work: fixture.componentInstance };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows the chart and how far it is', async () => {
    const { fixture } = await setup();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Rose');
    expect(text).toContain('Row 1 of 3');
    expect(text).toContain('0%');
  });

  it('marks a tapped row in row mode', async () => {
    const { work } = await setup();

    work.tap([0, 1]);

    expect(work.progress()?.doneRows).toEqual([1]);
  });

  it('marks a tapped stitch in stitch mode', async () => {
    const { work } = await setup();
    work.mode.set('stitch');

    work.tap([1, 1]);

    expect(work.progress()?.doneCells).toEqual([3]);
  });

  it('ignores taps beside the chart', async () => {
    const { work } = await setup();

    work.tap([5, 5]);

    expect(work.progress()).toEqual(EMPTY_PROGRESS);
  });

  it('finishes a row and moves on', async () => {
    const { work } = await setup();

    work.finishRow();

    expect(work.progress()).toMatchObject({ doneRows: [0], currentRow: 1 });
    expect(work.percent()).toBe(33);
  });

  it('saves after a pause and bundles quick changes', async () => {
    const { work, api } = await setup();
    vi.useFakeTimers();

    work.finishRow();
    work.finishRow();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);

    expect(api.saveProgress).toHaveBeenCalledTimes(1);
    expect(api.saveProgress).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ doneRows: [0, 1], currentRow: 2 }),
    );
  });

  it('saves what is pending when leaving', async () => {
    const { fixture, work, api } = await setup();
    vi.useFakeTimers();

    work.finishRow();
    fixture.destroy();

    expect(api.saveProgress).toHaveBeenCalledTimes(1);
  });

  it('explains a chart that cannot be opened', async () => {
    const { work, api } = await setup();
    api.get.mockRejectedValueOnce(
      new HttpErrorResponse({ status: 404, error: { detail: 'Gone' } }),
    );

    await work.open();

    expect(work.error()).toBe('Gone');
  });

  it('tells when saving failed and tries again with the next change', async () => {
    const { work, api } = await setup();
    vi.useFakeTimers();
    api.saveProgress.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));

    work.finishRow();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    expect(work.error()).toContain('cannot be reached');

    work.finishRow();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY);
    expect(work.error()).toBeNull();
  });
});
