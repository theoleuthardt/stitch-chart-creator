import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../api/api-error';
import { PatternApi } from '../../api/pattern-api';
import { renderThumbnail } from '../../chart/thumbnail';
import { Crop, heightForWidth } from '../../domain/image-quantize';
import { Pattern } from '../../domain/pattern';
import { ConvertResult, ImageConverter, LoadedImage } from './image-converter';

interface Settings {
  colors?: number;
  width?: number;
  crop?: Partial<Crop>;
}

/** Turns an image into a chart. The image stays in the browser, only the chart is stored. */
@Component({
  selector: 'scc-image-import',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2>Import an image</h2>
      <p class="muted">The image stays on your device. Only the finished chart is saved.</p>
      <label class="field" for="image-file">
        <span>Image</span>
        <input
          id="image-file"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          (change)="fileChosen($any($event.target))"
        />
      </label>

      @if (image()) {
        <div class="settings">
          <label class="field" for="import-title">
            <span>Title</span>
            <input
              id="import-title"
              maxlength="200"
              [value]="title()"
              (input)="title.set($any($event.target).value)"
            />
          </label>
          <label class="field" for="import-width">
            <span>Width in stitches</span>
            <input
              id="import-width"
              type="number"
              min="1"
              max="1000"
              [value]="width()"
              (change)="update({ width: $any($event.target).valueAsNumber })"
            />
          </label>
          <label class="field" for="import-colors">
            <span>Colours</span>
            <input
              id="import-colors"
              type="number"
              min="1"
              max="256"
              [value]="colors()"
              (change)="update({ colors: $any($event.target).valueAsNumber })"
            />
          </label>
        </div>
        <fieldset>
          <legend>Crop, in percent from each edge</legend>
          @for (edge of edges; track edge) {
            <label class="field" [for]="'crop-' + edge">
              <span>{{ edge }}</span>
              <input
                [id]="'crop-' + edge"
                type="number"
                min="0"
                max="95"
                [value]="crop()[edge]"
                (change)="setCrop(edge, $any($event.target).valueAsNumber)"
              />
            </label>
          }
        </fieldset>
      }

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      @if (preview(); as url) {
        <p class="muted">
          {{ width() }} × {{ height() }} stitches, {{ result()?.palette?.length }} colours
        </p>
        <img class="preview" [src]="url" alt="Preview of the chart" />
      }

      <div class="actions">
        <button class="button primary" type="button" [disabled]="!canSave()" (click)="save()">
          Create chart
        </button>
        <a class="button" routerLink="/">Cancel</a>
      </div>
    </section>
  `,
  styles: `
    .settings {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 0.75rem;
    }

    fieldset {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin: 0 0 1rem;
      padding: 0.5rem 0.75rem 0;
      border: 1px solid var(--color-border);
      border-radius: 0.25rem;
    }

    legend {
      padding: 0 0.25rem;
      font-size: 0.875rem;
    }

    fieldset .field span {
      font-size: 0.875rem;
      text-transform: capitalize;
    }

    fieldset input {
      width: 100%;
    }

    .preview {
      display: block;
      max-width: 100%;
      width: 24rem;
      margin-bottom: 1rem;
      image-rendering: pixelated;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    a.button {
      text-decoration: none;
    }
  `,
})
export class ImageImport {
  private readonly converter = inject(ImageConverter);
  private readonly api = inject(PatternApi);
  private readonly router = inject(Router);
  private conversion = 0;

  readonly edges = ['left', 'top', 'right', 'bottom'] as const;
  readonly title = signal('Imported image');
  readonly width = signal(60);
  readonly colors = signal(16);
  readonly crop = signal<Crop>({ left: 0, top: 0, right: 0, bottom: 0 });
  readonly image = signal<LoadedImage | null>(null);
  readonly result = signal<ConvertResult | null>(null);
  readonly error = signal<string | null>(null);

  readonly height = computed(() => {
    const image = this.image();
    if (!image) {
      return 0;
    }
    const { left, top, right, bottom } = this.crop();
    const visibleWidth = image.width * (1 - (left + right) / 100);
    const visibleHeight = image.height * (1 - (top + bottom) / 100);
    return heightForWidth(Math.max(1, visibleWidth), Math.max(1, visibleHeight), this.width(), 1);
  });
  readonly chart = computed<Pattern | null>(() => {
    const result = this.result();
    return result
      ? {
          title: this.title().trim(),
          craftType: 'crossStitch',
          width: this.width(),
          height: this.height(),
          palette: result.palette,
          cells: result.cells,
        }
      : null;
  });
  readonly preview = computed(() => {
    const chart = this.chart();
    return chart ? renderThumbnail(chart) : undefined;
  });
  readonly canSave = computed(() => this.chart() !== null && this.title().trim().length > 0);

  fileChosen(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    return file ? this.choose(file) : Promise.resolve();
  }

  async choose(file: File): Promise<void> {
    this.error.set(null);
    this.result.set(null);
    this.image.set(null);
    try {
      this.image.set(await this.converter.load(file));
      this.title.set(file.name.replace(/\.[^.]+$/, ''));
      await this.convert();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'This file could not be read.');
    }
  }

  /** Takes over changed settings and converts again. */
  update({ colors, width, crop }: Settings): Promise<void> {
    if (colors !== undefined && Number.isInteger(colors) && colors > 0) {
      this.colors.set(colors);
    }
    if (width !== undefined && Number.isInteger(width) && width > 0) {
      this.width.set(width);
    }
    if (crop) {
      this.crop.update((current) => ({ ...current, ...crop }));
    }
    return this.convert();
  }

  setCrop(edge: keyof Crop, percent: number): Promise<void> {
    return this.update({ crop: { [edge]: Number.isFinite(percent) ? percent : 0 } });
  }

  async save(): Promise<void> {
    const chart = this.chart();
    if (!chart) {
      return;
    }
    this.error.set(null);
    try {
      const created = await this.api.create(chart);
      await this.router.navigateByUrl(`/charts/${created.id}`);
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }

  /** Converts with the current settings. A slower older run cannot replace a newer result. */
  private async convert(): Promise<void> {
    const image = this.image();
    if (!image) {
      return;
    }
    const run = ++this.conversion;
    try {
      const result = await this.converter.convert(image, {
        crop: this.crop(),
        width: this.width(),
        height: this.height(),
        colors: this.colors(),
      });
      if (run === this.conversion) {
        this.result.set(result);
      }
    } catch (error) {
      if (run === this.conversion) {
        this.error.set(error instanceof Error ? error.message : 'The conversion failed.');
      }
    }
  }
}
