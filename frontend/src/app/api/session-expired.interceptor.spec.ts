import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { sessionExpiredInterceptor } from './session-expired.interceptor';
import { SessionService } from './session.service';

describe('sessionExpiredInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let session: SessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    session.setUser({ id: '1', username: 'theo', email: 'theo@example.com' });
  });

  it('signs out locally and goes to sign-in when a session expires', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const request = firstValueFrom(http.get('/api/patterns'));
    backend.expectOne('/api/patterns').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(request).rejects.toBeTruthy();
    expect(session.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/sign-in');
  });

  it('leaves a failed login to the form', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const request = firstValueFrom(http.post('/api/auth/login', {}));
    backend.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(request).rejects.toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('ignores other errors', async () => {
    const request = firstValueFrom(http.get('/api/patterns'));
    backend.expectOne('/api/patterns').flush(null, { status: 500, statusText: 'Server Error' });

    await expect(request).rejects.toBeTruthy();
    expect(session.user()).not.toBeNull();
  });
});
