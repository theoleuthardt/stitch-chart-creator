import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('uses the detail of a problem response', () => {
    const error = new HttpErrorResponse({ status: 409, error: { detail: 'Name is taken' } });
    expect(apiErrorMessage(error)).toBe('Name is taken');
  });

  it('explains an unreachable server', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 0 }))).toBe(
      'The server cannot be reached. Please try again.',
    );
  });

  it('explains the rate limit', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 429 }))).toBe(
      'Too many attempts. Please wait a minute.',
    );
  });

  it('falls back to a generic message', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500 }))).toBe(
      'Something went wrong. Please try again.',
    );
    expect(apiErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
