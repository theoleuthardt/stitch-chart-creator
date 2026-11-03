import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from './session.service';

/**
 * A 401 on a normal route of a signed-in user means that the session ended, so the user goes back
 * to sign-in. The auth routes are left out: there a 401 is a wrong password or nobody signed in.
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.startsWith('/api/auth/') &&
        session.signedIn()
      ) {
        session.setUser(null);
        void router.navigateByUrl('/sign-in');
      }
      return throwError(() => error);
    }),
  );
};
