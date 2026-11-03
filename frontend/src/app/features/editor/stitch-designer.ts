import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { isStitchAbbreviation, StitchDrawing } from '../../domain/symbols';
import { StitchGlyph } from './stitch-glyph';

/** Drawn points snap to a grid of this many steps. */
const GRID = 8;

/** Snaps a position to the drawing grid inside the unit square. */
export function snapToGrid(value: number): number {
  return Math.min(1, Math.max(0, Math.round(value * GRID) / GRID));
}

/** Draws a custom stitch from lines and circles: two clicks make one shape. */
@Component({
  selector: 'scc-stitch-designer',
  imports: [StitchGlyph],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field" for="stitch-name">
      <span>Name</span>
      <input
        id="stitch-name"
        maxlength="60"
        [value]="name()"
        (input)="name.set($any($event.target).value)"
      />
    </label>
    <label class="field" for="stitch-abbreviation">
      <span>Abbreviation</span>
      <input
        id="stitch-abbreviation"
        maxlength="12"
        [value]="abbreviation()"
        (input)="abbreviation.set($any($event.target).value)"
      />
    </label>
    <div class="modes">
      <button
        class="button"
        type="button"
        [class.active]="mode() === 'line'"
        [attr.aria-pressed]="mode() === 'line'"
        (click)="mode.set('line')"
      >
        Line
      </button>
      <button
        class="button"
        type="button"
        [class.active]="mode() === 'circle'"
        [attr.aria-pressed]="mode() === 'circle'"
        (click)="mode.set('circle')"
      >
        Circle
      </button>
      <button class="button" type="button" (click)="undo()">Undo</button>
    </div>
    <button
      class="pad"
      type="button"
      aria-label="Drawing area: two clicks make one shape"
      (click)="padClick($event)"
    >
      <scc-stitch-glyph [stitch]="drawing()" />
      @if (pending(); as point) {
        <span class="pending" [style.left.%]="point[0] * 100" [style.top.%]="point[1] * 100"></span>
      }
    </button>
    <button class="button primary" type="button" [disabled]="!ready()" (click)="save()">
      Save stitch
    </button>
  `,
  styles: `
    :host {
      display: block;
      padding: 0 0.75rem 0.75rem;
      font-size: 0.875rem;
    }

    .field {
      margin-bottom: 0.5rem;
    }

    .modes {
      display: flex;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }

    .modes .button {
      padding: 0.1875rem 0.5rem;
      font-size: 0.8125rem;
    }

    .button.active {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    .pad {
      display: block;
      position: relative;
      width: 10rem;
      height: 10rem;
      margin-bottom: 0.5rem;
      padding: 0;
      border: 1px solid var(--color-border);
      background-color: var(--chart-paper);
      background-image:
        linear-gradient(var(--chart-grid-minor) 1px, transparent 1px),
        linear-gradient(90deg, var(--chart-grid-minor) 1px, transparent 1px);
      background-size: 12.5% 12.5%;
      color: #000000;
      cursor: crosshair;
    }

    .pad scc-stitch-glyph,
    .pad ::ng-deep svg {
      width: 100%;
      height: 100%;
    }

    .pending {
      position: absolute;
      width: 0.5rem;
      height: 0.5rem;
      margin: -0.25rem 0 0 -0.25rem;
      border-radius: 50%;
      background: var(--color-accent);
    }
  `,
})
export class StitchDesigner {
  readonly saved = output<StitchDrawing>();

  readonly name = signal('');
  readonly abbreviation = signal('');
  readonly mode = signal<'line' | 'circle'>('line');
  readonly lines = signal<(readonly [number, number, number, number])[]>([]);
  readonly circles = signal<(readonly [number, number, number])[]>([]);
  readonly pending = signal<readonly [number, number] | null>(null);

  private readonly order: ('line' | 'circle')[] = [];

  readonly drawing = computed<StitchDrawing>(() => ({
    name: this.name().trim(),
    abbreviation: this.abbreviation().trim(),
    lines: this.lines(),
    circles: this.circles(),
  }));

  readonly ready = computed(() => {
    const { name, abbreviation, lines, circles } = this.drawing();
    return (
      name.length > 0 && isStitchAbbreviation(abbreviation) && lines.length + circles.length > 0
    );
  });

  padClick(event: MouseEvent): void {
    const pad = event.currentTarget as HTMLElement;
    this.place(event.offsetX / pad.clientWidth, event.offsetY / pad.clientHeight);
  }

  /** Takes a point in the unit square; the second one finishes a shape. */
  place(x: number, y: number): void {
    const point = [snapToGrid(x), snapToGrid(y)] as const;
    const start = this.pending();
    if (!start) {
      this.pending.set(point);
      return;
    }
    this.pending.set(null);
    if (start[0] === point[0] && start[1] === point[1]) {
      return;
    }
    if (this.mode() === 'line') {
      this.lines.update((lines) => [...lines, [start[0], start[1], point[0], point[1]]]);
      this.order.push('line');
    } else {
      const radius = Math.hypot(point[0] - start[0], point[1] - start[1]);
      const fitting = Math.min(radius, start[0], start[1], 1 - start[0], 1 - start[1]);
      if (fitting > 0) {
        this.circles.update((circles) => [...circles, [start[0], start[1], fitting]]);
        this.order.push('circle');
      }
    }
  }

  undo(): void {
    this.pending.set(null);
    const last = this.order.pop();
    if (last === 'line') {
      this.lines.update((lines) => lines.slice(0, -1));
    } else if (last === 'circle') {
      this.circles.update((circles) => circles.slice(0, -1));
    }
  }

  save(): void {
    this.saved.emit(this.drawing());
    this.name.set('');
    this.abbreviation.set('');
    this.lines.set([]);
    this.circles.set([]);
    this.order.length = 0;
  }
}
