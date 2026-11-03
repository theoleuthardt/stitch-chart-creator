import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Pattern } from '../../domain/pattern';
import { downloadFile, fileName } from '../../export/download';
import { canvasFits, exportLayout, ExportOptions } from '../../export/image-layout';
import { serializePattern } from '../../export/pattern-file';
import { Paper, pdfLayout, PdfOptions } from '../../export/pdf-layout';
import { renderPdf } from '../../export/to-pdf';
import { renderPng } from '../../export/to-png';
import { renderSvg } from '../../export/to-svg';
import { fitsExcel, renderXlsx } from '../../export/to-xlsx';
import { EditorStore } from './editor-store';

/** The largest stitch of an exported image in pixels. */
const MAX_CELL_SIZE = 200;

/** Turns the open chart into files. */
@Component({
  selector: 'scc-export-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Export</h3>
    <label class="field" for="export-cell-size">
      <span>Pixels per stitch</span>
      <input
        id="export-cell-size"
        type="number"
        min="1"
        max="200"
        [value]="options().cellSize"
        (input)="setCellSize($any($event.target).valueAsNumber)"
      />
    </label>
    <label class="check">
      <input
        type="checkbox"
        [checked]="options().gridLines"
        (change)="set('gridLines', $any($event.target).checked)"
      />
      Grid lines
    </label>
    <label class="check">
      <input
        type="checkbox"
        [checked]="options().numbers"
        (change)="set('numbers', $any($event.target).checked)"
      />
      Row and column numbers
    </label>
    <label class="check">
      <input
        type="checkbox"
        [checked]="options().legend"
        (change)="set('legend', $any($event.target).checked)"
      />
      Colour legend
    </label>
    <p class="muted" role="status">{{ size().width }} × {{ size().height }} px</p>
    <div class="paper">
      <label class="field" for="export-paper">
        <span>Paper</span>
        <select id="export-paper" (change)="setPaper($any($event.target).value)">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
      </label>
      <label class="check">
        <input
          type="checkbox"
          [checked]="pdf().landscape"
          (change)="setLandscape($any($event.target).checked)"
        />
        Landscape
      </label>
    </div>
    <p class="muted">PDF: {{ pdfPages() }} {{ pdfPages() === 1 ? 'page' : 'pages' }} plus legend</p>
    @if (!fits()) {
      <p class="error" role="alert">
        This image is too large for a browser. Choose fewer pixels per stitch.
      </p>
    }
    @if (error(); as message) {
      <p class="error" role="alert">{{ message }}</p>
    }
    <div class="actions">
      <button class="button" type="button" [disabled]="!fits()" (click)="exportPng()">PNG</button>
      <button class="button" type="button" (click)="exportSvg()">SVG</button>
      <button class="button" type="button" [disabled]="busy()" (click)="exportPdf()">PDF</button>
      <button class="button" type="button" [disabled]="busy()" (click)="exportXlsx()">Excel</button>
      <button class="button" type="button" (click)="exportJson()">Chart file</button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 0.75rem;
      border-top: 1px solid var(--color-border);
      font-size: 0.875rem;
    }

    h3 {
      margin: 0 0 0.5rem;
      font-size: 0.9375rem;
    }

    .field {
      margin-bottom: 0.5rem;
    }

    .paper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .check {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.25rem;
    }

    p {
      margin: 0.5rem 0;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
  `,
})
export class ExportPanel {
  private readonly store = inject(EditorStore);

  readonly options = signal<ExportOptions>({
    cellSize: 20,
    gridLines: true,
    numbers: true,
    legend: true,
  });
  readonly pdf = signal<PdfOptions>({ paper: 'a4', landscape: false });
  readonly pdfPages = computed(() => pdfLayout(this.store.pattern(), this.pdf()).pages.length);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly size = computed(() => exportLayout(this.store.pattern(), this.options()));
  readonly fits = computed(() => canvasFits(this.size().width, this.size().height));

  setCellSize(cellSize: number): void {
    if (Number.isInteger(cellSize) && cellSize > 0 && cellSize <= MAX_CELL_SIZE) {
      this.options.update((options) => ({ ...options, cellSize }));
    }
  }

  set(option: 'gridLines' | 'numbers' | 'legend', value: boolean): void {
    this.options.update((options) => ({ ...options, [option]: value }));
  }

  setPaper(paper: Paper): void {
    this.pdf.update((pdf) => ({ ...pdf, paper }));
  }

  setLandscape(landscape: boolean): void {
    this.pdf.update((pdf) => ({ ...pdf, landscape }));
  }

  exportPdf(): Promise<void> {
    return this.export('pdf', (pattern) => renderPdf(pattern, this.pdf()));
  }

  exportPng(): Promise<void> {
    return this.export('png', (pattern) => renderPng(pattern, this.options()));
  }

  exportXlsx(): Promise<void> {
    if (!fitsExcel(this.store.pattern())) {
      this.error.set('This chart is larger than an Excel worksheet.');
      return Promise.resolve();
    }
    return this.export('xlsx', renderXlsx);
  }

  /** Runs one export at a time and shows why one failed. */
  private async export(
    extension: string,
    render: (pattern: Pattern) => Promise<Blob>,
  ): Promise<void> {
    const pattern = this.store.pattern();
    this.error.set(null);
    this.busy.set(true);
    try {
      downloadFile(fileName(pattern.title, extension), await render(pattern));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The export failed.');
    } finally {
      this.busy.set(false);
    }
  }

  exportSvg(): void {
    const pattern = this.store.pattern();
    downloadFile(
      fileName(pattern.title, 'svg'),
      new Blob([renderSvg(pattern, this.options())], { type: 'image/svg+xml' }),
    );
  }

  exportJson(): void {
    const pattern = this.store.pattern();
    downloadFile(
      fileName(pattern.title, 'json'),
      new Blob([serializePattern(pattern)], { type: 'application/json' }),
    );
  }
}
