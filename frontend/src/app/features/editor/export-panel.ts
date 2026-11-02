import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { downloadFile, fileName } from '../../export/download';
import { serializePattern } from '../../export/pattern-file';
import { EditorStore } from './editor-store';

/** Turns the open chart into files. */
@Component({
  selector: 'scc-export-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Export</h3>
    <button class="button" type="button" (click)="exportJson()">Chart file (JSON)</button>
  `,
  styles: `
    :host {
      display: block;
      padding: 0.75rem;
      border-top: 1px solid var(--color-border);
    }

    h3 {
      margin: 0 0 0.5rem;
      font-size: 0.9375rem;
    }
  `,
})
export class ExportPanel {
  private readonly store = inject(EditorStore);

  exportJson(): void {
    const pattern = this.store.pattern();
    downloadFile(
      fileName(pattern.title, 'json'),
      new Blob([serializePattern(pattern)], { type: 'application/json' }),
    );
  }
}
