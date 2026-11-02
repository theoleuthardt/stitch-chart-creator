import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { Pattern } from '../../domain/pattern';
import { EditorStore } from './editor-store';

/** Where the open chart stands compared to the server. */
export type SaveStatus = 'saved' | 'pending' | 'saving' | 'offline' | 'conflict' | 'failed';

/** The pause after a change before it is saved, in milliseconds. */
export const AUTOSAVE_DELAY = 1500;

/** The time between attempts while the server cannot be reached, in milliseconds. */
export const RETRY_DELAY = 5000;

/**
 * Saves the open chart in the background. Changes stay in the store until a save succeeded, so a
 * lost connection only delays them. A conflict stops saving until the user decides.
 */
export class Autosave {
  readonly status = signal<SaveStatus>('saved');

  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving = false;
  private stopped = false;

  constructor(
    private readonly store: EditorStore,
    private readonly save: (pattern: Pattern, version: number) => Promise<number>,
    private version: number,
  ) {}

  /** Reports a change; the save follows after a pause. */
  changed(): void {
    if (this.saving || this.status() === 'conflict') {
      return;
    }
    this.status.set('pending');
    this.schedule(AUTOSAVE_DELAY);
  }

  /** Saves pending changes now, for example when leaving the screen. */
  flush(): void {
    if (this.store.dirty() && !this.saving && this.status() !== 'conflict') {
      this.clearTimer();
      void this.run();
    }
  }

  /** Resolves a conflict in favour of this chart, on top of the newest stored version. */
  overwrite(version: number): void {
    this.version = version;
    this.clearTimer();
    void this.run();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
  }

  private schedule(delay: number): void {
    this.clearTimer();
    if (!this.stopped) {
      this.timer = setTimeout(() => void this.run(), delay);
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async run(): Promise<void> {
    this.saving = true;
    this.status.set('saving');
    const snapshot = this.store.pattern();
    try {
      this.version = await this.save(snapshot, this.version);
      this.store.markSaved(snapshot);
      this.saving = false;
      if (this.store.dirty()) {
        this.changed();
      } else {
        this.status.set('saved');
      }
    } catch (error) {
      this.saving = false;
      this.handleFailure(error);
    }
  }

  private handleFailure(error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : -1;
    if (status === 409) {
      this.status.set('conflict');
    } else if (status === 0 || status >= 500) {
      this.status.set('offline');
      this.schedule(RETRY_DELAY);
    } else {
      this.status.set('failed');
    }
  }
}
