import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PatternApi } from '../../api/pattern-api';
import { createPattern, setCell } from '../../domain/pattern';
import { Editor } from './editor';
import { EditorStore } from './editor-store';

class FakeResizeObserver {
  observe = () => undefined;
  disconnect = () => undefined;
}

describe('Editor', () => {
  const setup = async (get: ReturnType<typeof vi.fn>) => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const api = { get, save: vi.fn(() => Promise.resolve({ version: 2 })) };
    TestBed.configureTestingModule({
      imports: [Editor],
      providers: [
        { provide: PatternApi, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'a' }) } },
        },
      ],
    });
    const fixture = TestBed.createComponent(Editor);
    await fixture.whenStable();
    return { fixture, api, element: fixture.nativeElement as HTMLElement };
  };

  afterEach(() => vi.unstubAllGlobals());

  it('opens the stored chart', async () => {
    const pattern = { ...createPattern(2, 2, 'crossStitch', 'Rose'), id: 'a', version: 1 };

    const { element, api } = await setup(vi.fn(() => Promise.resolve(pattern)));

    expect(api.get).toHaveBeenCalledWith('a');
    expect(element.querySelector('scc-chart-canvas')).not.toBeNull();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('All changes saved');
  });

  it('explains when the chart cannot be opened', async () => {
    const missing = new HttpErrorResponse({ status: 404, error: { detail: 'Not Found' } });

    const { element } = await setup(vi.fn(() => Promise.reject(missing)));

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Not Found');
    expect(element.querySelector('scc-chart-canvas')).toBeNull();
  });

  it('keeps the open chart when the other version cannot be loaded', async () => {
    const pattern = { ...createPattern(2, 2), id: 'a', version: 1 };
    const get = vi.fn(() => Promise.resolve(pattern));
    const { fixture, element } = await setup(get);
    const store = fixture.debugElement.injector.get(EditorStore);
    store.apply(setCell(store.pattern(), 0, 0, 1));
    get.mockImplementation(() => Promise.reject(new HttpErrorResponse({ status: 0 })));

    await fixture.componentInstance.reload();
    await fixture.whenStable();

    expect(store.pattern().cells[0]).toBe(1);
    expect(element.querySelector('scc-chart-canvas')).not.toBeNull();
    expect(fixture.componentInstance.notice()).toContain('cannot be reached');
  });

  it('shows why keeping this version failed', async () => {
    const pattern = { ...createPattern(2, 2), id: 'a', version: 1 };
    const get = vi.fn(() => Promise.resolve(pattern));
    const { fixture } = await setup(get);
    get.mockImplementation(() => Promise.reject(new HttpErrorResponse({ status: 0 })));

    await fixture.componentInstance.overwrite();

    expect(fixture.componentInstance.notice()).toContain('cannot be reached');
  });

  it('warns before leaving with unsaved changes', async () => {
    const pattern = { ...createPattern(2, 2), id: 'a', version: 1 };
    const { fixture } = await setup(vi.fn(() => Promise.resolve(pattern)));
    const store = fixture.debugElement.injector.get(EditorStore);
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;

    fixture.componentInstance.beforeUnload(event);
    expect(event.defaultPrevented).toBe(false);

    store.apply(setCell(store.pattern(), 0, 0, 1));
    fixture.componentInstance.beforeUnload(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
