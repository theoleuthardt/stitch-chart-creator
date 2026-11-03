import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { apiErrorMessage } from '../../api/api-error';
import { PatternApi } from '../../api/pattern-api';

/** Creates and revokes the read-only link of a chart. */
@Component({
  selector: 'scc-share-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Share</h3>
    @if (url(); as link) {
      <label class="field" for="share-link">
        <span>Read-only link</span>
        <input id="share-link" readonly [value]="link" (focus)="$any($event.target).select()" />
      </label>
      <div class="actions">
        <button class="button" type="button" (click)="copy(link)">Copy</button>
        <button class="button" type="button" (click)="revoke()">Stop sharing</button>
      </div>
      @if (copied()) {
        <p class="muted" role="status">Copied.</p>
      }
    } @else {
      <button class="button" type="button" (click)="create()">Create a link</button>
    }
    @if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 0.75rem;
      border-top: 1px solid var(--color-border);
      font-size: 0.875rem;
    }

    h3 {
      margin: 0 0 0.5rem;
      font-size: 0.9375rem;
    }

    .field {
      margin-bottom: 0.5rem;
    }

    .actions {
      display: flex;
      gap: 0.25rem;
    }

    p {
      margin: 0.5rem 0 0;
    }
  `,
})
export class SharePanel implements OnInit {
  private readonly api = inject(PatternApi);

  readonly chartId = input.required<string>();
  readonly slug = signal<string | null>(null);
  readonly copied = signal(false);
  readonly error = signal<string | null>(null);
  readonly url = computed(() => {
    const slug = this.slug();
    return slug ? `${location.origin}/share/${slug}` : null;
  });

  ngOnInit(): Promise<void> {
    return this.attempt(async () => {
      this.slug.set((await this.api.shareStatus(this.chartId())).slug);
    });
  }

  create(): Promise<void> {
    return this.attempt(async () => {
      this.slug.set((await this.api.share(this.chartId())).slug);
    });
  }

  revoke(): Promise<void> {
    return this.attempt(async () => {
      await this.api.revokeShare(this.chartId());
      this.slug.set(null);
      this.copied.set(false);
    });
  }

  async copy(link: string): Promise<void> {
    await navigator.clipboard.writeText(link);
    this.copied.set(true);
  }

  private async attempt(action: () => Promise<void>): Promise<void> {
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }
}
