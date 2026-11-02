import { ChangeDetectionStrategy, Component, HostListener, inject, viewChild } from '@angular/core';
import { createPattern } from '../../domain/pattern';
import { ChartCanvas } from './chart-canvas';
import { EditorStore, Tool } from './editor-store';
import { PalettePanel } from './palette-panel';
import { shortcutFor } from './shortcuts';

/** The editor screen around the chart. */
@Component({
  selector: 'scc-editor',
  imports: [ChartCanvas, PalettePanel],
  providers: [EditorStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="editor">
      <div class="toolbar" role="toolbar" aria-label="Chart tools">
        @for (entry of tools; track entry.tool) {
          <button
            class="button"
            type="button"
            [class.active]="store.tool() === entry.tool"
            [attr.aria-pressed]="store.tool() === entry.tool"
            [title]="entry.label + ' (' + entry.key + ')'"
            (click)="store.setTool(entry.tool)"
          >
            {{ entry.label }}
          </button>
        }
        <span class="separator"></span>
        <button class="button" type="button" [disabled]="!store.canUndo()" (click)="store.undo()">
          Undo
        </button>
        <button class="button" type="button" [disabled]="!store.canRedo()" (click)="store.redo()">
          Redo
        </button>
        <span class="separator"></span>
        <button class="button" type="button" (click)="canvas().zoom(1.25)">Zoom in</button>
        <button class="button" type="button" (click)="canvas().zoom(0.8)">Zoom out</button>
        <button class="button" type="button" (click)="canvas().fit()">Fit</button>
      </div>
      <div class="workspace">
        <scc-chart-canvas
          [pattern]="store.pattern()"
          (strokeStart)="store.strokeStart($event)"
          (strokeMove)="store.strokeMove($event)"
          (strokeEnd)="store.strokeEnd()"
          (strokeCancel)="store.strokeCancel()"
        />
        <scc-palette-panel />
      </div>
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

    .separator {
      width: 1px;
      background: var(--color-border);
    }

    .button.active {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    .workspace {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    scc-chart-canvas {
      flex: 1;
      min-width: 0;
    }

    scc-palette-panel {
      flex: none;
      width: 15rem;
      border-left: 1px solid var(--color-border);
      background: var(--color-surface);
    }
  `,
})
export class Editor {
  readonly store = inject(EditorStore);
  readonly canvas = viewChild.required(ChartCanvas);
  readonly tools: readonly { tool: Tool; label: string; key: string }[] = [
    { tool: 'pencil', label: 'Pencil', key: 'P' },
    { tool: 'eraser', label: 'Eraser', key: 'E' },
    { tool: 'fill', label: 'Fill', key: 'F' },
    { tool: 'picker', label: 'Picker', key: 'I' },
    { tool: 'line', label: 'Line', key: 'L' },
    { tool: 'rectangle', label: 'Rectangle', key: 'R' },
  ];

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

  @HostListener('document:keydown', ['$event'])
  keyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }
    const shortcut = shortcutFor(event);
    if (!shortcut) {
      return;
    }
    event.preventDefault();
    if ('tool' in shortcut) {
      this.store.setTool(shortcut.tool);
    } else if (shortcut.action === 'undo') {
      this.store.undo();
    } else {
      this.store.redo();
    }
  }
}
