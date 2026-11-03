import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../api/api-error';
import { PatternApi, StoredPattern } from '../../api/pattern-api';
import {
  finishRow,
  moveRow,
  percentDone,
  Progress,
  toggleCell,
  toggleRow,
} from '../../domain/progress';
import { ChartCanvas } from '../editor/chart-canvas';

/** The pause after a change before the progress is saved, in milliseconds. */
export const SAVE_DELAY = 800;

/** Follows a chart while stitching: nothing can be drawn here, only marked as done. */
@Component({
  selector: 'scc-work',
  imports: [ChartCanvas, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chart(); as pattern) {
      <div class="work">
        <div class="bar">
          <strong>{{ pattern.title }}</strong>
          <span>{{ percent() }}%</span>
          <a class="button" [routerLink]="['/charts', id]">Edit</a>
        </div>
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
        @if (progress(); as current) {
          <scc-chart-canvas [pattern]="pattern" [progress]="current" (strokeStart)="tap($event)" />
          <div class="controls">
            <div class="row">
              <button class="button" type="button" (click)="move(-1)">Previous row</button>
              <span role="status">Row {{ current.currentRow + 1 }} of {{ pattern.height }}</span>
              <button class="button" type="button" (click)="move(1)">Next row</button>
            </div>
            <div class="row">
              <button class="button primary" type="button" (click)="finishRow()">Row done</button>
              <label>
                Tapping marks
                <select
                  [value]="mode()"
                  (change)="mode.set($any($event.target).value)"
                  aria-label="What a tap on the chart marks"
                >
                  <option value="row">a row</option>
                  <option value="stitch">a stitch</option>
                </select>
              </label>
            </div>
          </div>
        }
      </div>
    } @else if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .work {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .bar strong {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    a.button {
      text-decoration: none;
    }

    scc-chart-canvas {
      flex: 1;
      min-height: 0;
    }

    .controls {
      padding: 0.5rem 1rem;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin: 0.25rem 0;
    }

    .controls .button {
      min-height: 2.75rem;
    }

    select {
      min-height: 2.75rem;
      font: inherit;
    }

    .error {
      margin: 0.5rem 1rem;
    }
  `,
})
export class Work {
  private readonly api = inject(PatternApi);

  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  readonly chart = signal<StoredPattern | null>(null);
  readonly progress = signal<Progress | null>(null);
  readonly mode = signal<'row' | 'stitch'>('row');
  readonly error = signal<string | null>(null);
  readonly percent = computed(() => {
    const chart = this.chart();
    const progress = this.progress();
    return chart && progress ? percentDone(chart, progress) : 0;
  });

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.saveNow();
    });
    void this.open();
  }

  async open(): Promise<void> {
    try {
      const [chart, progress] = await Promise.all([
        this.api.get(this.id),
        this.api.getProgress(this.id),
      ]);
      this.chart.set(chart);
      this.progress.set(progress);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }

  /** A tap on the chart marks its row or its stitch, depending on the mode. */
  tap([x, y]: readonly [number, number]): void {
    const chart = this.chart();
    if (!chart || x < 0 || y < 0 || x >= chart.width || y >= chart.height) {
      return;
    }
    this.change((progress) =>
      this.mode() === 'row' ? toggleRow(progress, y) : toggleCell(progress, y * chart.width + x),
    );
  }

  move(delta: number): void {
    this.change((progress) => moveRow(progress, delta, this.chart()?.height ?? 1));
  }

  finishRow(): void {
    this.change((progress) => finishRow(progress, this.chart()?.height ?? 1));
  }

  private change(update: (progress: Progress) => Progress): void {
    const progress = this.progress();
    if (progress) {
      this.progress.set(update(progress));
      this.schedule();
    }
  }

  private schedule(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.saveNow();
    }, SAVE_DELAY);
  }

  private saveNow(): void {
    const progress = this.progress();
    if (this.timer === null || !progress) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = null;
    this.api.saveProgress(this.id, progress).then(
      () => {
        this.error.set(null);
      },
      (error: unknown) => {
        this.error.set(apiErrorMessage(error));
      },
    );
  }
}
