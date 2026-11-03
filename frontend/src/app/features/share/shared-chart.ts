import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../api/api-error';
import { PatternApi } from '../../api/pattern-api';
import { SessionService } from '../../api/session.service';
import { Pattern } from '../../domain/pattern';
import { ChartCanvas } from '../editor/chart-canvas';

/** The read-only view of a shared chart. It needs no account. */
@Component({
  selector: 'scc-shared-chart',
  imports: [ChartCanvas, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chart(); as pattern) {
      <div class="shared">
        <div class="bar">
          <strong>{{ pattern.title }}</strong>
          <span class="muted">{{ pattern.width }} × {{ pattern.height }}</span>
          @if (session.signedIn()) {
            <button class="button primary" type="button" (click)="copy()">Copy to my charts</button>
          } @else {
            <a class="button" routerLink="/sign-in">Sign in to keep a copy</a>
          }
        </div>
        @if (notice(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
        <scc-chart-canvas [pattern]="pattern" />
      </div>
    } @else if (error(); as message) {
      <section class="panel narrow">
        <p class="error" role="alert">{{ message }}</p>
        <a routerLink="/">Go to the start page</a>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .shared {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .bar strong {
      flex: 1;
      min-width: 0;
    }

    a.button {
      text-decoration: none;
    }

    scc-chart-canvas {
      flex: 1;
      min-height: 0;
    }
  `,
})
export class SharedChart {
  private readonly api = inject(PatternApi);
  private readonly router = inject(Router);
  private readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug') ?? '';

  readonly session = inject(SessionService);
  readonly chart = signal<Pattern | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  constructor() {
    void this.open();
  }

  /** Stores a copy of the chart in the library of the signed-in user. */
  async copy(): Promise<void> {
    const chart = this.chart();
    if (!chart) {
      return;
    }
    try {
      const created = await this.api.create(chart);
      await this.router.navigateByUrl(`/charts/${created.id}`);
    } catch (error) {
      this.notice.set(apiErrorMessage(error));
    }
  }

  private async open(): Promise<void> {
    try {
      this.chart.set(await this.api.readShared(this.slug));
    } catch (error) {
      const gone = error instanceof HttpErrorResponse && error.status === 404;
      this.error.set(gone ? 'This link does not work any more.' : apiErrorMessage(error));
    }
  }
}
