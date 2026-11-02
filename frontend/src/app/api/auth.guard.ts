import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

/** Sends anonymous visitors to sign-in and remembers where they wanted to go. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(SessionService).signedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users away from the sign-in and registration screens. */
export const guestGuard: CanActivateFn = () =>
  inject(SessionService).signedIn() ? inject(Router).createUrlTree(['/']) : true;
