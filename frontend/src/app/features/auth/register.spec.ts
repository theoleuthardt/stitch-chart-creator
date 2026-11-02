import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Register } from './register';

describe('Register', () => {
  const setup = async () => {
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Register);
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
    return { element, type, submit };
  };

  it('rejects a short password before calling the backend', async () => {
    const { element, type, submit } = await setup();
    const http = TestBed.inject(HttpTestingController);

    type('#username', 'theo');
    type('#email', 'theo@example.com');
    type('#password', 'short');
    await submit();

    http.expectNone('/api/auth/register');
    expect(element.textContent).toContain('At least 12 characters');
  });

  it('rejects an invalid username before calling the backend', async () => {
    const { type, submit } = await setup();
    const http = TestBed.inject(HttpTestingController);

    type('#username', 'bad name!');
    type('#email', 'theo@example.com');
    type('#password', 'correct horse battery');
    await submit();

    http.expectNone('/api/auth/register');
  });

  it('registers with valid input', async () => {
    const { type, submit } = await setup();
    const http = TestBed.inject(HttpTestingController);

    type('#username', 'theo');
    type('#email', 'theo@example.com');
    type('#password', 'correct horse battery');
    await submit();

    expect(http.expectOne('/api/auth/register').request.body).toEqual({
      username: 'theo',
      email: 'theo@example.com',
      password: 'correct horse battery',
    });
  });
});
