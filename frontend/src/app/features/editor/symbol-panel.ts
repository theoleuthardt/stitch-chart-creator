import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StitchSymbol, symbolsFor } from '../../domain/symbols';
import { EditorStore } from './editor-store';

/** The stitches of the chart's craft. Colour crafts show nothing here. */
@Component({
  selector: 'scc-symbol-panel',
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
              <svg viewBox="0 0 1 1" aria-hidden="true">
                @for (line of symbol.lines; track $index) {
                  <line
                    [attr.x1]="line[0]"
                    [attr.y1]="line[1]"
                    [attr.x2]="line[2]"
                    [attr.y2]="line[3]"
                  />
                }
                @for (circle of symbol.circles; track $index) {
                  <circle [attr.cx]="circle[0]" [attr.cy]="circle[1]" [attr.r]="circle[2]" />
                }
              </svg>
              <small>{{ symbol.abbreviation }}</small>
            </button>
          </li>
        }
      </ul>
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

    button {
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

    button.active {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    svg {
      width: 1.5rem;
      height: 1.5rem;
      fill: none;
      stroke: currentcolor;
      stroke-width: 0.08;
    }

    small {
      font-size: 0.6875rem;
    }
  `,
})
export class SymbolPanel {
  readonly store = inject(EditorStore);
  readonly symbols = computed(() => symbolsFor(this.store.pattern().craftType));

  pick(symbol: StitchSymbol): void {
    this.store.setSymbol(symbol.id);
    this.store.setTool('symbol');
  }
}
