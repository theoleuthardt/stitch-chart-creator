import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { apiErrorMessage } from '../../api/api-error';
import { PatternApi, StoredPattern } from '../../api/pattern-api';
import { Autosave, SaveStatus } from './autosave';
import { ChartCanvas } from './chart-canvas';
import { ChartSettings } from './chart-settings';
import { EditorStore, Tool } from './editor-store';
import { PalettePanel } from './palette-panel';
import { shortcutFor } from './shortcuts';

const STATUS_TEXT: Readonly<Record<SaveStatus, string>> = {
  saved: 'All changes saved',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  offline: 'Offline, retrying…',
  conflict: 'Not saved',
  failed: 'The chart could not be saved',
};

/** The editor screen around the chart. */
@Component({
  selector: 'scc-editor',
  imports: [ChartCanvas, ChartSettings, PalettePanel],
  providers: [EditorStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loadError(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    } @else if (ready()) {
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
          <span class="status" role="status">{{ statusText() }}</span>
        </div>
        @if (status() === 'conflict') {
          <div class="conflict" role="alert">
            <span>{{ notice() ?? 'This chart was changed elsewhere.' }}</span>
            <button class="button" type="button" (click)="reload()">Load the other version</button>
            <button class="button" type="button" (click)="overwrite()">Keep mine</button>
          </div>
        }
        <div class="workspace">
          <scc-chart-canvas
            [pattern]="store.pattern()"
            (strokeStart)="store.strokeStart($event)"
            (strokeMove)="store.strokeMove($event)"
            (strokeEnd)="store.strokeEnd()"
            (strokeCancel)="store.strokeCancel()"
          />
          <aside>
            <scc-chart-settings />
            <scc-palette-panel />
          </aside>
        </div>
      </div>
    }
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

    aside {
      flex: none;
      width: 15rem;
      overflow: auto;
      border-left: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .status {
      margin-left: auto;
      align-self: center;
      color: var(--color-muted);
      font-size: 0.875rem;
    }

    @media (width < 48rem) {
      .workspace {
        flex-direction: column;
      }

      aside {
        width: 100%;
        max-height: 40%;
        border-top: 1px solid var(--color-border);
        border-left: 0;
      }
    }

    .conflict {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-danger);
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

  readonly ready = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly status = computed(() => this.autosave()?.status() ?? 'saved');
  readonly statusText = computed(() => STATUS_TEXT[this.status()]);

  private readonly api = inject(PatternApi);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly autosave = signal<Autosave | null>(null);

  constructor() {
    effect(() => {
      this.store.pattern();
      if (this.store.dirty()) {
        untracked(() => this.autosave()?.changed());
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.autosave()?.flush();
      this.autosave()?.stop();
    });
    void this.open();
  }

  private async open(): Promise<void> {
    try {
      this.start(await this.api.get(this.id));
      this.ready.set(true);
    } catch (error) {
      this.loadError.set(apiErrorMessage(error));
    }
  }

  private start(stored: StoredPattern): void {
    this.autosave()?.stop();
    this.store.load(stored);
    this.autosave.set(
      new Autosave(
        this.store,
        async (pattern, version) => (await this.api.save(this.id, pattern, version)).version,
        stored.version,
      ),
    );
  }

  /** Replaces this state with the stored one. The open chart stays if that cannot be loaded. */
  async reload(): Promise<void> {
    try {
      this.start(await this.api.get(this.id));
      this.notice.set(null);
    } catch (error) {
      this.notice.set(apiErrorMessage(error));
    }
  }

  /** Keeps this state and stores it on top of the version that caused the conflict. */
  async overwrite(): Promise<void> {
    try {
      const stored = await this.api.get(this.id);
      this.autosave()?.overwrite(stored.version);
      this.notice.set(null);
    } catch (error) {
      this.notice.set(apiErrorMessage(error));
    }
  }

  /** Warns before leaving while changes are not stored yet. */
  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.store.dirty()) {
      this.autosave()?.flush();
      event.preventDefault();
    }
  }

  @HostListener('document:keydown', ['$event'])
  keyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
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
