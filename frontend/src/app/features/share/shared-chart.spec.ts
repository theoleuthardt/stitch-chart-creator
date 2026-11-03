import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { PatternApi } from '../../api/pattern-api';
import { SessionService } from '../../api/session.service';
import { createPattern } from '../../domain/pattern';
import { SharedChart } from './shared-chart';

class FakeResizeObserver {
  observe = () => undefined;
  disconnect = () => undefined;
}

const chart = createPattern(2, 2, 'crossStitch', 'Rose');

describe('SharedChart', () => {
  const setup = async (signedIn: boolean, read = vi.fn(() => Promise.resolve(chart))) => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const api = { readShared: read, create: vi.fn(() => Promise.resolve({ id: 'copy' })) };
    TestBed.configureTestingModule({
      imports: [SharedChart],
      providers: [
        provideRouter([]),
        { provide: PatternApi, useValue: api },
        { provide: SessionService, useValue: { signedIn: signal(signedIn) } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: 'abc' }) } },
        },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SharedChart);
    await fixture.whenStable();
    return {
      fixture,
      api,
      navigate,
      shared: fixture.componentInstance,
      element: fixture.nativeElement as HTMLElement,
    };
  };

  afterEach(() => vi.unstubAllGlobals());

  it('shows the chart of the link', async () => {
    const { element, api } = await setup(false);

    expect(api.readShared).toHaveBeenCalledWith('abc');
    expect(element.textContent).toContain('Rose');
    expect(element.querySelector('scc-chart-canvas')).not.toBeNull();
  });

  it('invites visitors to sign in to keep a copy', async () => {
    const { element } = await setup(false);

    expect(element.textContent).toContain('Sign in');
  });

  it('copies the chart into the library of a signed-in user', async () => {
    const { shared, api, navigate } = await setup(true);

    await shared.copy();

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rose' }));
    expect(navigate).toHaveBeenCalledWith('/charts/copy');
  });

  it('explains a link that does not work any more', async () => {
    const gone = new HttpErrorResponse({ status: 404 });

    const { element } = await setup(
      false,
      vi.fn(() => Promise.reject(gone)),
    );

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'This link does not work any more.',
    );
  });

  it('explains other failures with their own message', async () => {
    const busy = new HttpErrorResponse({ status: 429 });

    const { shared } = await setup(
      false,
      vi.fn(() => Promise.reject(busy)),
    );

    expect(shared.error()).toContain('Too many');
  });
});
