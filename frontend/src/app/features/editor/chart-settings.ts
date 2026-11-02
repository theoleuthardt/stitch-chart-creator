import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { resize } from '../../domain/pattern';
import { EditorStore } from './editor-store';

/** Title and size of the open chart. */
@Component({
  selector: 'scc-chart-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Chart</h3>
    <label class="field" for="chart-title">
      <span>Title</span>
      <input
        id="chart-title"
        maxlength="200"
        [value]="store.pattern().title"
        (change)="rename($any($event.target).value)"
      />
    </label>
    <div class="size">
      <label class="field" for="chart-width">
        <span>Width</span>
        <input
          id="chart-width"
          type="number"
          min="1"
          [value]="store.pattern().width"
          (input)="width.set($any($event.target).valueAsNumber)"
        />
      </label>
      <label class="field" for="chart-height">
        <span>Height</span>
        <input
          id="chart-height"
          type="number"
          min="1"
          [value]="store.pattern().height"
          (input)="height.set($any($event.target).valueAsNumber)"
        />
      </label>
    </div>
    @if (canResize()) {
      <button class="button" type="button" (click)="applySize()">Resize</button>
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }

    h3 {
      margin: 0 0 0.5rem;
      font-size: 0.9375rem;
    }

    .size {
      display: flex;
      gap: 0.5rem;
    }

    .size input {
      width: 100%;
    }

    .field {
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
  `,
})
export class ChartSettings {
  readonly store = inject(EditorStore);
  readonly width = signal<number | null>(null);
  readonly height = signal<number | null>(null);

  /** A size is resizable when it is a positive whole number and differs from the current one. */
  readonly canResize = computed(() => {
    const { width, height } = this.target();
    const pattern = this.store.pattern();
    return (
      Number.isInteger(width) &&
      Number.isInteger(height) &&
      width > 0 &&
      height > 0 &&
      (width !== pattern.width || height !== pattern.height)
    );
  });

  rename(title: string): void {
    const trimmed = title.trim();
    if (trimmed && trimmed !== this.store.pattern().title) {
      this.store.apply({ ...this.store.pattern(), title: trimmed });
    }
  }

  applySize(): void {
    const { width, height } = this.target();
    this.store.apply(resize(this.store.pattern(), width, height));
    this.width.set(null);
    this.height.set(null);
  }

  private target(): { width: number; height: number } {
    const pattern = this.store.pattern();
    return { width: this.width() ?? pattern.width, height: this.height() ?? pattern.height };
  }
}
