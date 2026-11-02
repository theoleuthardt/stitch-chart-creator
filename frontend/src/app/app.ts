import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SessionService } from './api/session.service';

/** Application shell: the page header and the routed screen below it. */
@Component({
  selector: 'scc-root',
  imports: [RouterLink, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <h1><a routerLink="/">Stitch Chart Creator</a></h1>
      @if (session.user(); as user) {
        <nav>
          <a routerLink="/account">{{ user.username }}</a>
          <button class="button" type="button" (click)="signOut()">Sign out</button>
        </nav>
      }
    </header>
    <main class="app-main">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }

    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    h1 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    h1 a {
      color: inherit;
      text-decoration: none;
    }

    nav {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .app-main {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
  `,
})
export class App {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);

  async signOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigateByUrl('/sign-in');
  }
}
