import { computed, Injectable, signal } from '@angular/core';
import { createPattern, Pattern } from '../../domain/pattern';

/** The tools of the editor. */
export type Tool = 'pencil' | 'eraser' | 'fill' | 'picker' | 'line' | 'rectangle';

/** Undo steps kept at most. */
const MAX_HISTORY_STEPS = 100;

/** Cells kept across all undo steps at most, which bounds the memory on big charts. */
const MAX_HISTORY_CELLS = 20_000_000;

/**
 * The state of the open chart. Patterns are immutable, so history entries are plain references and
 * steps that did not touch `cells` share its array. One instance belongs to one editor screen.
 */
@Injectable()
export class EditorStore {
  private readonly current = signal<Pattern>(createPattern(1, 1));
  private readonly saved = signal<Pattern>(this.current());
  private readonly undoStack = signal<readonly Pattern[]>([]);
  private readonly redoStack = signal<readonly Pattern[]>([]);
  private strokeStart: Pattern | null = null;

  readonly tool = signal<Tool>('pencil');
  readonly color = signal(1);
  readonly pattern = this.current.asReadonly();
  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);
  readonly dirty = computed(() => this.current() !== this.saved());

  /** Opens a chart with a fresh history. */
  load(pattern: Pattern): void {
    this.current.set(pattern);
    this.saved.set(pattern);
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.strokeStart = null;
    this.color.set(1);
  }

  setTool(tool: Tool): void {
    this.tool.set(tool);
  }

  setColor(color: number): void {
    this.color.set(color);
  }

  /** Replaces the chart. During a stroke the change joins the undo step of that stroke. */
  apply(next: Pattern): void {
    const previous = this.current();
    if (next === previous) {
      return;
    }
    this.current.set(next);
    if (this.color() > next.palette.length) {
      this.color.set(Math.max(1, next.palette.length));
    }
    if (!this.strokeStart) {
      this.remember(previous);
    }
  }

  beginStroke(): void {
    this.strokeStart = this.current();
  }

  endStroke(): void {
    const start = this.strokeStart;
    this.strokeStart = null;
    if (start && start !== this.current()) {
      this.remember(start);
    }
  }

  undo(): void {
    const previous = this.undoStack().at(-1);
    if (previous) {
      this.redoStack.update((stack) => [...stack, this.current()]);
      this.undoStack.update((stack) => stack.slice(0, -1));
      this.current.set(previous);
    }
  }

  redo(): void {
    const next = this.redoStack().at(-1);
    if (next) {
      this.undoStack.update((stack) => [...stack, this.current()]);
      this.redoStack.update((stack) => stack.slice(0, -1));
      this.current.set(next);
    }
  }

  /** Marks a state as stored. A change made in the meantime keeps the store dirty. */
  markSaved(pattern: Pattern): void {
    this.saved.set(pattern);
  }

  private remember(pattern: Pattern): void {
    this.redoStack.set([]);
    this.undoStack.update((stack) => {
      const steps = [...stack, pattern].slice(-MAX_HISTORY_STEPS);
      let cells = 0;
      let oldest = steps.length - 1;
      for (let step = oldest; step >= 0; step--) {
        cells += (steps[step] as Pattern).cells.length;
        if (cells > MAX_HISTORY_CELLS) {
          break;
        }
        oldest = step;
      }
      return steps.slice(oldest);
    });
  }
}
