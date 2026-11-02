import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** The signed-in user as the backend reports it. */
export interface User {
  id: string;
  username: string;
  email: string;
}

/** Holds who is signed in and wraps the auth and account routes. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly current = signal<User | null>(null);

  readonly user = this.current.asReadonly();
  readonly signedIn = computed(() => this.current() !== null);

  setUser(user: User | null): void {
    this.current.set(user);
  }

  /**
   * Asks the backend who is signed in. This also hands out the CSRF cookie that every write needs,
   * so it has to run again whenever a session ends, because the backend drops the cookie then. A
   * failure just means nobody is signed in.
   */
  async load(): Promise<void> {
    try {
      this.current.set(await firstValueFrom(this.http.get<User>('/api/auth/me')));
    } catch {
      this.current.set(null);
    }
  }

  async signIn(username: string, password: string): Promise<void> {
    this.current.set(
      await firstValueFrom(this.http.post<User>('/api/auth/login', { username, password })),
    );
  }

  async register(username: string, email: string, password: string): Promise<void> {
    this.current.set(
      await firstValueFrom(
        this.http.post<User>('/api/auth/register', { username, email, password }),
      ),
    );
  }

  /**
   * Ends the session. Whether that worked is decided by asking the backend afterwards: a session
   * that already ended elsewhere makes the logout fail, and the user is signed out all the same.
   */
  async signOut(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/logout', null)).catch(() => undefined);
    await this.load();
  }

  async updateProfile(username: string, email: string): Promise<void> {
    this.current.set(
      await firstValueFrom(this.http.put<User>('/api/account', { username, email })),
    );
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(this.http.put('/api/account/password', { currentPassword, newPassword }));
  }

  async deleteAccount(password: string): Promise<void> {
    await firstValueFrom(this.http.delete('/api/account', { body: { password } }));
    await this.load();
  }
}
