import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { SessionService } from './session.service';

const run = (guard: typeof authGuard, url = '/') =>
  TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );

describe('route guards', () => {
  let session: SessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    session = TestBed.inject(SessionService);
  });

  it('lets signed-in users through authGuard', () => {
    session.setUser({ id: '1', username: 'theo', email: 'theo@example.com' });
    expect(run(authGuard)).toBe(true);
  });

  it('sends anonymous visitors to sign-in and remembers the target', () => {
    const result = run(authGuard, '/charts/1') as UrlTree;
    expect(result.toString()).toBe('/sign-in?returnUrl=%2Fcharts%2F1');
  });

  it('lets anonymous visitors through guestGuard', () => {
    expect(run(guestGuard)).toBe(true);
  });

  it('sends signed-in users away from the guest screens', () => {
    session.setUser({ id: '1', username: 'theo', email: 'theo@example.com' });
    expect((run(guestGuard) as UrlTree).toString()).toBe('/');
  });
});
