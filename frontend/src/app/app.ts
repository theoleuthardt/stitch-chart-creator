import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Application shell: the page header and the routed screen below it. */
@Component({
  selector: 'scc-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <h1>Stitch Chart Creator</h1>
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
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--color-border);
    }

    h1 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .app-main {
      flex: 1;
      min-height: 0;
    }
  `,
})
export class App {}
