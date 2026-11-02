import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionService, User } from './session.service';

const user: User = { id: '1', username: 'theo', email: 'theo@example.com' };

describe('SessionService', () => {
  let session: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('knows the signed-in user after loading', async () => {
    const loaded = session.load();
    http.expectOne('/api/auth/me').flush(user);
    await loaded;

    expect(session.user()).toEqual(user);
    expect(session.signedIn()).toBe(true);
  });

  it('treats a 401 while loading as signed out', async () => {
    const loaded = session.load();
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await loaded;

    expect(session.user()).toBeNull();
    expect(session.signedIn()).toBe(false);
  });

  it('stays usable when the backend is unreachable while loading', async () => {
    const loaded = session.load();
    http.expectOne('/api/auth/me').error(new ProgressEvent('error'));
    await loaded;

    expect(session.user()).toBeNull();
  });

  it('stores the user after signing in', async () => {
    const done = session.signIn('theo', 'secret');
    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'theo', password: 'secret' });
    request.flush(user);
    await done;

    expect(session.user()).toEqual(user);
  });

  it('stores the user after registering', async () => {
    const done = session.register('theo', 'theo@example.com', 'secret');
    const request = http.expectOne('/api/auth/register');
    expect(request.request.body).toEqual({
      username: 'theo',
      email: 'theo@example.com',
      password: 'secret',
    });
    request.flush(user);
    await done;

    expect(session.user()).toEqual(user);
  });

  const answerCsrfRefresh = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
  };

  it('forgets the user after signing out and fetches a new CSRF cookie', async () => {
    session.setUser(user);
    const done = session.signOut();
    http.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await answerCsrfRefresh();
    await done;

    expect(session.user()).toBeNull();
  });

  it('asks the backend who is signed in when signing out fails', async () => {
    session.setUser(user);
    const done = session.signOut();
    http.expectOne('/api/auth/logout').flush(null, { status: 401, statusText: 'Unauthorized' });
    await answerCsrfRefresh();
    await done;

    expect(session.user()).toBeNull();
  });

  it('updates the user after a profile change', async () => {
    session.setUser(user);
    const changed = { ...user, username: 'leuthardt' };
    const done = session.updateProfile('leuthardt', user.email);
    const request = http.expectOne('/api/account');
    expect(request.request.method).toBe('PUT');
    request.flush(changed);
    await done;

    expect(session.user()).toEqual(changed);
  });

  it('sends the current and the new password', async () => {
    const done = session.changePassword('old', 'new');
    const request = http.expectOne('/api/account/password');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ currentPassword: 'old', newPassword: 'new' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await done;
  });

  it('forgets the user after deleting the account and fetches a new CSRF cookie', async () => {
    session.setUser(user);
    const done = session.deleteAccount('secret');
    const request = http.expectOne('/api/account');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ password: 'secret' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await answerCsrfRefresh();
    await done;

    expect(session.user()).toBeNull();
  });
});
