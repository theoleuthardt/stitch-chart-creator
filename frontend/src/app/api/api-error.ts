import { HttpErrorResponse } from '@angular/common/http';

/** Turns a failed API call into a message for the user. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'The server cannot be reached. Please try again.';
    }
    if (error.status === 429) {
      return 'Too many attempts. Please wait a minute.';
    }
    if (error.status === 413) {
      return 'This chart is too large to save.';
    }
    if (error.status === 503) {
      return 'The server is busy. Please try again in a moment.';
    }
    const body = error.error as { detail?: unknown } | null;
    if (typeof body?.detail === 'string') {
      return body.detail;
    }
  }
  return 'Something went wrong. Please try again.';
}
