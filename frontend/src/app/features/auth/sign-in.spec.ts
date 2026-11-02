import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SignIn } from './sign-in';

describe('SignIn', () => {
  const setup = async () => {
    TestBed.configureTestingModule({
      imports: [SignIn],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(SignIn);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const type = (selector: string, value: string) => {
      const input = element.querySelector<HTMLInputElement>(selector);
      if (!input) throw new Error(`missing ${selector}`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      element.querySelector('form')?.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    };
    return { fixture, element, type, submit };
  };

  it('does not send an incomplete form', async () => {
    const { submit } = await setup();
    const http = TestBed.inject(HttpTestingController);

    await submit();

    http.expectNone('/api/auth/login');
  });

  it('goes to the library after signing in', async () => {
    const { type, submit } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const http = TestBed.inject(HttpTestingController);

    type('#username', 'theo');
    type('#password', 'correct horse battery');
    await submit();
    http
      .expectOne('/api/auth/login')
      .flush({ id: '1', username: 'theo', email: 'theo@example.com' });
    await TestBed.inject(Router).routerState.root.fragment;
    await new Promise((resolve) => setTimeout(resolve));

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the message of a failed sign-in', async () => {
    const { fixture, element, type, submit } = await setup();
    const http = TestBed.inject(HttpTestingController);

    type('#username', 'theo');
    type('#password', 'wrong');
    await submit();
    http
      .expectOne('/api/auth/login')
      .flush(
        { detail: 'Invalid username or password' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Invalid username or password',
    );
  });
});
