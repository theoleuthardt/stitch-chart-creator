import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { addColor, changeColor, isHexColor, mergeColors, removeColor } from '../../domain/palette';
import { colorUsage } from '../../domain/pattern';
import { EditorStore } from './editor-store';

/** Lists the colours of the chart and lets the user pick, change, remove and merge them. */
@Component({
  selector: 'scc-palette-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Colours</h3>
    <ul>
      @for (color of store.pattern().palette; track $index) {
        <li [class.active]="store.color() === $index + 1">
          <input
            type="color"
            [value]="color"
            [attr.aria-label]="'Change colour ' + ($index + 1)"
            (change)="setColor($index + 1, $any($event.target).value)"
          />
          <button
            class="pick"
            type="button"
            [attr.aria-pressed]="store.color() === $index + 1"
            [attr.aria-label]="'Draw with ' + color"
            (click)="store.setColor($index + 1)"
          >
            <span>{{ color }}</span>
            <small>{{ usage()[$index] ?? 0 }}</small>
          </button>
          <button
            class="remove"
            type="button"
            [attr.aria-label]="'Remove ' + color"
            (click)="requestRemoval($index + 1)"
          >
            ×
          </button>
        </li>
      }
    </ul>

    @if (removing(); as number) {
      <div class="confirm" role="alertdialog" aria-label="Remove a colour in use">
        <p>{{ usage()[number - 1] }} stitches use this colour.</p>
        <button class="button" type="button" (click)="remove(number, 0)">Clear them</button>
        @for (color of store.pattern().palette; track $index) {
          @if ($index + 1 !== number) {
            <button
              class="swatch"
              type="button"
              [style.background]="color"
              [attr.aria-label]="'Replace with ' + color"
              (click)="remove(number, $index + 1)"
            ></button>
          }
        }
        <button class="button" type="button" (click)="removing.set(null)">Cancel</button>
      </div>
    }

    <button class="button" type="button" (click)="add()">Add colour</button>

    @if (store.pattern().palette.length > 1) {
      <h3>Merge</h3>
      <p class="muted">Move the active colour's stitches to:</p>
      <div class="swatches">
        @for (color of store.pattern().palette; track $index) {
          @if ($index + 1 !== store.color()) {
            <button
              class="swatch"
              type="button"
              [style.background]="color"
              [attr.aria-label]="'Merge into ' + color"
              (click)="merge($index + 1)"
            ></button>
          }
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 0.75rem;
      overflow: auto;
    }

    h3 {
      margin: 0 0 0.5rem;
      font-size: 0.9375rem;
    }

    ul {
      margin: 0 0 0.75rem;
      padding: 0;
      list-style: none;
    }

    li {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.125rem;
      border: 1px solid transparent;
      border-radius: 0.25rem;
    }

    li.active {
      border-color: var(--color-accent);
    }

    input[type='color'] {
      flex: none;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
      background: none;
      cursor: pointer;
    }

    .pick {
      display: flex;
      flex: 1;
      justify-content: space-between;
      min-width: 0;
      padding: 0.25rem;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .pick small {
      color: var(--color-muted);
    }

    .remove {
      border: 0;
      background: none;
      color: var(--color-muted);
      font-size: 1.125rem;
      cursor: pointer;
    }

    .confirm {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-bottom: 0.75rem;
      padding: 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
    }

    .confirm p {
      width: 100%;
      margin: 0;
    }

    .swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .swatch {
      width: 1.75rem;
      height: 1.75rem;
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
      cursor: pointer;
    }
  `,
})
export class PalettePanel {
  readonly store = inject(EditorStore);
  readonly usage = computed(() => colorUsage(this.store.pattern()));
  readonly removing = signal<number | null>(null);

  setColor(colorNumber: number, color: string): void {
    if (isHexColor(color)) {
      this.store.apply(changeColor(this.store.pattern(), colorNumber, color));
    }
  }

  add(): void {
    this.store.apply(addColor(this.store.pattern(), '#808080'));
    this.store.setColor(this.store.pattern().palette.length);
  }

  /** An unused colour goes at once; a colour in use asks what happens to its stitches. */
  requestRemoval(colorNumber: number): void {
    if ((this.usage()[colorNumber - 1] ?? 0) > 0) {
      this.removing.set(colorNumber);
    } else {
      this.remove(colorNumber, 0);
    }
  }

  remove(colorNumber: number, replacement: number): void {
    this.removing.set(null);
    this.store.apply(removeColor(this.store.pattern(), colorNumber, replacement));
  }

  merge(into: number): void {
    const from = this.store.color();
    this.store.apply(mergeColors(this.store.pattern(), from, into));
    this.store.setColor(into > from ? into - 1 : into);
  }
}
