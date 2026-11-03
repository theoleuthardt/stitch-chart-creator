import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { apiErrorMessage } from '../../api/api-error';
import { AccountStitch, StitchApi } from '../../api/stitch-api';
import { embedStitch, StitchDrawing, StitchSymbol, symbolsFor } from '../../domain/symbols';
import { EditorStore } from './editor-store';
import { StitchDesigner } from './stitch-designer';
import { StitchGlyph } from './stitch-glyph';

/** The stitches of the chart's craft and of the account, and the form for a new one. */
@Component({
  selector: 'scc-symbol-panel',
  imports: [StitchDesigner, StitchGlyph],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (symbols().length > 0) {
      <h3>Stitches</h3>
      <ul>
        @for (symbol of symbols(); track symbol.id) {
          <li>
            <button
              type="button"
              [class.active]="store.tool() === 'symbol' && store.symbol() === symbol.id"
              [attr.aria-label]="symbol.name"
              [attr.aria-pressed]="store.tool() === 'symbol' && store.symbol() === symbol.id"
              [title]="symbol.name"
              (click)="pick(symbol)"
            >
              <scc-stitch-glyph [stitch]="symbol" />
              <small>{{ symbol.abbreviation }}</small>
            </button>
          </li>
        }
      </ul>
    }

    <h3>Your stitches</h3>
    @if (stitches().length > 0) {
      <ul>
        @for (stitch of stitches(); track stitch.id) {
          <li class="own">
            <button
              type="button"
              [attr.aria-label]="stitch.name"
              [title]="stitch.name"
              (click)="pickOwn(stitch)"
            >
              <scc-stitch-glyph [stitch]="stitch" />
              <small>{{ stitch.abbreviation }}</small>
            </button>
            <button
              class="remove"
              type="button"
              [attr.aria-label]="'Delete ' + stitch.name"
              (click)="removeStitch(stitch)"
            >
              ×
            </button>
          </li>
        }
      </ul>
    }
    @if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
    <button class="new button" type="button" (click)="designing.set(!designing())">
      {{ designing() ? 'Close' : 'New stitch' }}
    </button>
    @if (designing()) {
      <scc-stitch-designer (saved)="saveStitch($event)" />
    }
  `,
  styles: `
    :host {
      display: block;
    }

    h3 {
      margin: 0 0 0.5rem;
      padding: 0.75rem 0.75rem 0;
      font-size: 0.9375rem;
    }

    ul {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.25rem;
      margin: 0;
      padding: 0 0.75rem 0.75rem;
      list-style: none;
    }

    li button:not(.remove) {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      padding: 0.25rem 0;
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
      background: none;
      color: inherit;
      cursor: pointer;
    }

    li button.active {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    .own {
      position: relative;
    }

    .remove {
      position: absolute;
      top: 0;
      right: 0;
      padding: 0 0.1875rem;
      border: 0;
      background: none;
      color: var(--color-muted);
      cursor: pointer;
    }

    small {
      font-size: 0.6875rem;
    }

    .new {
      margin: 0 0.75rem 0.75rem;
    }

    .error {
      margin: 0 0.75rem 0.5rem;
      font-size: 0.875rem;
    }
  `,
})
export class SymbolPanel implements OnInit {
  readonly store = inject(EditorStore);
  private readonly api = inject(StitchApi);

  readonly symbols = computed(() => symbolsFor(this.store.pattern().craftType));
  readonly stitches = signal<AccountStitch[]>([]);
  readonly designing = signal(false);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.stitches.set(await this.api.list());
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }

  pick(symbol: StitchSymbol): void {
    this.select(symbol.id);
  }

  /** A stitch of the account joins the chart, so that the chart stays complete without it. */
  pickOwn({ name, abbreviation, lines, circles }: AccountStitch): void {
    const { pattern, id } = embedStitch(this.store.pattern(), {
      name,
      abbreviation,
      lines,
      circles,
    });
    this.store.apply(pattern);
    this.select(id);
  }

  async saveStitch(stitch: StitchDrawing): Promise<void> {
    this.error.set(null);
    try {
      const created = await this.api.create(stitch);
      this.stitches.update((stitches) => [...stitches, created]);
      this.designing.set(false);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }

  /** Removes a stitch from the account. Charts that use it keep their copy. */
  async removeStitch(stitch: AccountStitch): Promise<void> {
    this.error.set(null);
    try {
      await this.api.remove(stitch.id);
      this.stitches.update((stitches) => stitches.filter((entry) => entry.id !== stitch.id));
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }

  private select(id: number): void {
    this.store.setSymbol(id);
    this.store.setTool('symbol');
  }
}
