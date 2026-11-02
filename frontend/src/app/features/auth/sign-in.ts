import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../api/api-error';
import { SessionService } from '../../api/session.service';
import { safeReturnUrl } from '../../domain/return-url';

/** The sign-in screen. */
@Component({
  selector: 'scc-sign-in',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel narrow">
      <h2>Sign in</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label class="field" for="username">
          <span>Username or e-mail</span>
          <input id="username" formControlName="username" autocomplete="username" />
        </label>
        <label class="field" for="password">
          <span>Password</span>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </label>
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
        <button class="button primary" type="submit" [disabled]="busy()">Sign in</button>
      </form>
      <p class="muted">No account yet? <a routerLink="/register">Create one</a></p>
    </section>
  `,
})
export class SignIn {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || this.busy()) {
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.session.signIn(username, password);
      await this.router.navigateByUrl(
        safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
      );
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
