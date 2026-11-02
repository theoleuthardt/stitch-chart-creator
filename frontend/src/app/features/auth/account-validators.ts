import { Validators } from '@angular/forms';

/** The rules of the backend for usernames. */
export const usernameValidators = [
  Validators.required,
  Validators.minLength(3),
  Validators.maxLength(32),
  Validators.pattern(/^[A-Za-z0-9_.-]+$/),
];

/** The rules of the backend for e-mail addresses. */
export const emailValidators = [Validators.required, Validators.email, Validators.maxLength(254)];

/** The rules of the backend for new passwords. */
export const newPasswordValidators = [
  Validators.required,
  Validators.minLength(12),
  Validators.maxLength(128),
];
