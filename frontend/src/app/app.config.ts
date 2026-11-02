import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { sessionExpiredInterceptor } from './api/session-expired.interceptor';
import { SessionService } from './api/session.service';
import { routes } from './app.routes';

/** Root providers of the application. The session is known before the first route is checked. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
    provideAppInitializer(() => inject(SessionService).load()),
  ],
};
