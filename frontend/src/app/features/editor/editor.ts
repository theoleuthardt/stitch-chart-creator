import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { createPattern } from '../../domain/pattern';
import { ChartCanvas } from './chart-canvas';
import { EditorStore } from './editor-store';

/** The editor screen around the chart. */
@Component({
  selector: 'scc-editor',
  imports: [ChartCanvas],
  providers: [EditorStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="editor">
      <div class="toolbar" role="toolbar" aria-label="View">
        <button class="button" type="button" (click)="canvas().zoom(1.25)">Zoom in</button>
        <button class="button" type="button" (click)="canvas().zoom(0.8)">Zoom out</button>
        <button class="button" type="button" (click)="canvas().fit()">Fit</button>
      </div>
      <scc-chart-canvas [pattern]="store.pattern()" />
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .editor {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    scc-chart-canvas {
      flex: 1;
      min-height: 0;
    }
  `,
})
export class Editor {
  readonly store = inject(EditorStore);
  readonly canvas = viewChild.required(ChartCanvas);

  constructor() {
    const size = Number(new URLSearchParams(location.search).get('size')) || 50;
    const pattern = createPattern(size, size);
    this.store.load({
      ...pattern,
      palette: ['#a8324a', '#2f6f8f', '#e0b040'],
      cells: pattern.cells.map((_, index) =>
        (index % size) % 7 === Math.floor(index / size) % 7 ? (index % 3) + 1 : 0,
      ),
    });
  }
}
