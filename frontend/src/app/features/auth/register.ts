import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../api/api-error';
import { SessionService } from '../../api/session.service';

/** The registration screen. */
@Component({
  selector: 'scc-register',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel narrow">
      <h2>Create your account</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field" for="username">
          <span>Username</span>
          <input id="username" formControlName="username" autocomplete="username" />
          @if (attempted() && form.controls.username.invalid) {
            <small class="error">3 to 32 letters, digits, dots, dashes or underscores</small>
          }
        </label>
        <label class="field" for="email">
          <span>E-mail</span>
          <input id="email" type="email" formControlName="email" autocomplete="email" />
          @if (attempted() && form.controls.email.invalid) {
            <small class="error">Enter a valid e-mail address</small>
          }
        </label>
        <label class="field" for="password">
          <span>Password</span>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="new-password"
          />
          @if (attempted() && form.controls.password.invalid) {
            <small class="error">At least 12 characters</small>
          }
        </label>
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
        <button class="button primary" type="submit" [disabled]="busy()">Create account</button>
      </form>
      <p class="muted">Already registered? <a routerLink="/sign-in">Sign in</a></p>
    </section>
  `,
})
export class Register {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly form = inject(NonNullableFormBuilder).group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(32),
        Validators.pattern(/^[A-Za-z0-9_.-]+$/),
      ],
    ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
  });
  readonly attempted = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.attempted.set(true);
    if (this.form.invalid || this.busy()) {
      return;
    }
    const { username, email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.session.register(username, email, password);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
