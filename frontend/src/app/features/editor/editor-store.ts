import { computed, Injectable, signal } from '@angular/core';
import {
  createPattern,
  floodFill,
  getCell,
  Pattern,
  setCell,
  setCells,
} from '../../domain/pattern';
import { Cell, linePoints, rectanglePoints } from '../../domain/shapes';

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
  private strokeBase: Pattern | null = null;
  private origin: Cell = [0, 0];
  private last: Cell = [0, 0];

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
    this.strokeBase = null;
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
    this.show(next);
    if (!this.strokeBase) {
      this.remember(previous);
    }
  }

  beginStroke(): void {
    this.strokeBase = this.current();
  }

  endStroke(): void {
    const start = this.strokeBase;
    this.strokeBase = null;
    if (start && start !== this.current()) {
      this.remember(start);
    }
  }

  /** The active tool starts on a cell. */
  strokeStart(cell: Cell): void {
    this.beginStroke();
    this.origin = cell;
    this.last = cell;
    const [x, y] = cell;
    switch (this.tool()) {
      case 'fill':
        this.apply(floodFill(this.current(), x, y, this.color()));
        break;
      case 'picker':
        this.pick(x, y);
        break;
      default:
        this.apply(setCell(this.current(), x, y, this.strokeValue()));
    }
  }

  /**
   * The pointer moved on. Freehand tools connect to the previous cell, because a fast pointer skips
   * cells; line and rectangle redraw from the state before the stroke as a live preview.
   */
  strokeMove(cell: Cell): void {
    const base = this.strokeBase;
    if (!base) {
      return;
    }
    const [x, y] = cell;
    const [fromX, fromY] = this.origin;
    switch (this.tool()) {
      case 'pencil':
      case 'eraser':
        this.apply(setCells(this.current(), linePoints(...this.last, x, y), this.strokeValue()));
        this.last = cell;
        break;
      case 'line':
        this.apply(setCells(base, linePoints(fromX, fromY, x, y), this.strokeValue()));
        break;
      case 'rectangle':
        this.apply(setCells(base, rectanglePoints(fromX, fromY, x, y), this.strokeValue()));
        break;
      default:
    }
  }

  strokeEnd(): void {
    this.endStroke();
  }

  /** Takes back a stroke that turned out to be a gesture of two fingers. */
  strokeCancel(): void {
    if (this.strokeBase) {
      this.current.set(this.strokeBase);
      this.strokeBase = null;
    }
  }

  private strokeValue(): number {
    return this.tool() === 'eraser' ? 0 : this.color();
  }

  private pick(x: number, y: number): void {
    const value = getCell(this.current(), x, y);
    if (value) {
      this.color.set(value);
    }
  }

  undo(): void {
    const previous = this.undoStack().at(-1);
    if (previous && !this.strokeBase) {
      this.redoStack.update((stack) => [...stack, this.current()]);
      this.undoStack.update((stack) => stack.slice(0, -1));
      this.show(previous);
    }
  }

  redo(): void {
    const next = this.redoStack().at(-1);
    if (next && !this.strokeBase) {
      this.undoStack.update((stack) => [...stack, this.current()]);
      this.redoStack.update((stack) => stack.slice(0, -1));
      this.show(next);
    }
  }

  /** Marks a state as stored. A change made in the meantime keeps the store dirty. */
  markSaved(pattern: Pattern): void {
    this.saved.set(pattern);
  }

  /** Shows a chart and keeps the active colour inside its palette. */
  private show(pattern: Pattern): void {
    this.current.set(pattern);
    if (this.color() > pattern.palette.length) {
      this.color.set(Math.max(1, pattern.palette.length));
    }
  }

  private remember(pattern: Pattern): void {
    this.redoStack.set([]);
    this.undoStack.update((stack) => {
      const steps = [...stack, pattern].slice(-MAX_HISTORY_STEPS);
      const counted = new Set<readonly number[]>();
      let cells = 0;
      let oldest = steps.length - 1;
      for (let step = oldest; step >= 0; step--) {
        const stepCells = (steps[step] as Pattern).cells;
        if (!counted.has(stepCells)) {
          counted.add(stepCells);
          cells += stepCells.length;
        }
        if (cells > MAX_HISTORY_CELLS) {
          break;
        }
        oldest = step;
      }
      return steps.slice(oldest);
    });
  }
}
