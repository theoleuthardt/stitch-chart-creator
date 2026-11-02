import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { apiErrorMessage } from '../../api/api-error';
import { SessionService } from '../../api/session.service';

/** Profile, password and account deletion of the signed-in user. */
@Component({
  selector: 'scc-account-settings',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <section class="panel">
        <h2>Profile</h2>
        <form [formGroup]="profile" (ngSubmit)="saveProfile()">
          <label class="field" for="username">
            <span>Username</span>
            <input id="username" formControlName="username" autocomplete="username" />
          </label>
          <label class="field" for="email">
            <span>E-mail</span>
            <input id="email" type="email" formControlName="email" autocomplete="email" />
          </label>
          @if (profileMessage(); as message) {
            <p role="status">{{ message }}</p>
          }
          <button class="button primary" type="submit" [disabled]="profile.invalid">Save</button>
        </form>
      </section>

      <section class="panel">
        <h2>Password</h2>
        <form [formGroup]="password" (ngSubmit)="savePassword()">
          <label class="field" for="current-password">
            <span>Current password</span>
            <input
              id="current-password"
              type="password"
              formControlName="currentPassword"
              autocomplete="current-password"
            />
          </label>
          <label class="field" for="new-password">
            <span>New password, at least 12 characters</span>
            <input
              id="new-password"
              type="password"
              formControlName="newPassword"
              autocomplete="new-password"
            />
          </label>
          @if (passwordMessage(); as message) {
            <p role="status">{{ message }}</p>
          }
          <button class="button primary" type="submit" [disabled]="password.invalid">
            Change password
          </button>
        </form>
      </section>

      <section class="panel">
        <h2>Delete account</h2>
        <p class="muted">This removes your account and all your charts. It cannot be undone.</p>
        <form [formGroup]="deletion" (ngSubmit)="deleteAccount()">
          <label class="field" for="delete-password">
            <span>Password</span>
            <input
              id="delete-password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
          </label>
          @if (deleteMessage(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }
          <button class="button danger" type="submit" [disabled]="deletion.invalid">
            Delete my account
          </button>
        </form>
      </section>
    </div>
  `,
})
export class AccountSettings {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly forms = inject(NonNullableFormBuilder);

  readonly profile = this.forms.group({
    username: [
      this.session.user()?.username ?? '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(32),
        Validators.pattern(/^[A-Za-z0-9_.-]+$/),
      ],
    ],
    email: [
      this.session.user()?.email ?? '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
  });
  readonly password = this.forms.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
  });
  readonly deletion = this.forms.group({ password: ['', Validators.required] });

  readonly profileMessage = signal<string | null>(null);
  readonly passwordMessage = signal<string | null>(null);
  readonly deleteMessage = signal<string | null>(null);

  async saveProfile(): Promise<void> {
    const { username, email } = this.profile.getRawValue();
    try {
      await this.session.updateProfile(username, email);
      this.profileMessage.set('Saved.');
    } catch (error) {
      this.profileMessage.set(apiErrorMessage(error));
    }
  }

  async savePassword(): Promise<void> {
    const { currentPassword, newPassword } = this.password.getRawValue();
    try {
      await this.session.changePassword(currentPassword, newPassword);
      this.password.reset();
      this.passwordMessage.set('Password changed. Other devices were signed out.');
    } catch (error) {
      this.passwordMessage.set(apiErrorMessage(error));
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      await this.session.deleteAccount(this.deletion.getRawValue().password);
      await this.router.navigateByUrl('/sign-in');
    } catch (error) {
      this.deleteMessage.set(apiErrorMessage(error));
    }
  }
}
