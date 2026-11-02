import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../api/api-error';
import { PatternApi, PatternSummary } from '../../api/pattern-api';
import { createPattern, Pattern } from '../../domain/pattern';
import { parsePatternFile } from '../../export/pattern-file';

/** The start screen: the user's charts and a form for a new one. */
@Component({
  selector: 'scc-library',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="library">
      <section class="panel new">
        <h2>New chart</h2>
        <form [formGroup]="newChart" (ngSubmit)="create()">
          <label class="field" for="title">
            <span>Title</span>
            <input id="title" formControlName="title" />
          </label>
          <div class="size">
            <label class="field" for="width">
              <span>Width</span>
              <input id="width" type="number" min="1" formControlName="width" />
            </label>
            <label class="field" for="height">
              <span>Height</span>
              <input id="height" type="number" min="1" formControlName="height" />
            </label>
          </div>
          <button class="button primary" type="submit" [disabled]="newChart.invalid">
            Create chart
          </button>
        </form>
        <label class="button import" for="import-file">Open a chart file</label>
        <input
          id="import-file"
          class="visually-hidden"
          type="file"
          accept=".json,application/json"
          (change)="importFile($any($event.target))"
        />
      </section>

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <h2>Your charts</h2>
      @if (loaded() && charts().length === 0) {
        <p class="muted">You have no charts yet.</p>
      }
      <ul class="grid">
        @for (chart of charts(); track chart.id) {
          <li class="card">
            <a class="preview" [routerLink]="['/charts', chart.id]">
              @if (chart.thumbnail) {
                <img [src]="chart.thumbnail" alt="" />
              }
            </a>
            @if (renaming() === chart.id) {
              <form (submit)="$event.preventDefault(); rename(chart, name.value)">
                <input #name [value]="chart.title" aria-label="New title" />
                <button class="button" type="submit">Save</button>
              </form>
            } @else {
              <a class="title" [routerLink]="['/charts', chart.id]">{{ chart.title }}</a>
            }
            <small class="muted">{{ chart.width }} × {{ chart.height }}</small>
            <div class="actions">
              <button class="button" type="button" (click)="renaming.set(chart.id)">Rename</button>
              <button class="button" type="button" (click)="duplicate(chart)">Duplicate</button>
              @if (confirmDelete() === chart.id) {
                <button class="button danger" type="button" (click)="remove(chart)">
                  Really delete
                </button>
              } @else {
                <button class="button" type="button" (click)="confirmDelete.set(chart.id)">
                  Delete
                </button>
              }
            </div>
          </li>
        }
      </ul>
      @if (charts().length < total()) {
        <button class="button" type="button" (click)="more()">Show more</button>
      }
    </div>
  `,
  styles: `
    .library {
      max-width: 64rem;
      margin: 0 auto;
      padding: 0 1rem 2rem;
    }

    .new {
      max-width: none;
    }

    .size {
      display: flex;
      gap: 0.75rem;
    }

    .import {
      display: inline-block;
      margin-top: 0.5rem;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 1rem;
      margin: 0 0 1rem;
      padding: 0;
      list-style: none;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background: var(--color-surface);
    }

    .preview {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 8rem;
      background: var(--color-bg);
    }

    .preview img {
      max-width: 100%;
      max-height: 100%;
      image-rendering: pixelated;
    }

    .title {
      color: inherit;
      font-weight: 600;
      text-decoration: none;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.25rem;
    }

    .actions .button {
      padding: 0.1875rem 0.5rem;
      font-size: 0.8125rem;
    }
  `,
})
export class Library implements OnInit {
  private readonly api = inject(PatternApi);
  private readonly router = inject(Router);
  private page = 0;

  readonly newChart = inject(NonNullableFormBuilder).group({
    title: ['Untitled', [Validators.required, Validators.maxLength(200)]],
    width: [50, [Validators.required, Validators.min(1)]],
    height: [50, [Validators.required, Validators.min(1)]],
  });
  readonly charts = signal<PatternSummary[]>([]);
  readonly total = signal(0);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly renaming = signal<string | null>(null);
  readonly confirmDelete = signal<string | null>(null);

  ngOnInit(): Promise<void> {
    return this.attempt(async () => {
      const first = await this.api.list(0);
      this.charts.set(first.items);
      this.total.set(first.total);
      this.loaded.set(true);
    });
  }

  more(): Promise<void> {
    return this.attempt(async () => {
      this.page++;
      const next = await this.api.list(this.page);
      this.charts.update((charts) => [...charts, ...next.items]);
    });
  }

  create(): Promise<void> {
    if (this.newChart.invalid) {
      return Promise.resolve();
    }
    const { title, width, height } = this.newChart.getRawValue();
    return this.attempt(async () => {
      const created = await this.api.create(createPattern(width, height, 'crossStitch', title));
      await this.router.navigateByUrl(`/charts/${created.id}`);
    });
  }

  /** Opens a chart file as a new chart. A broken file only gives a message. */
  importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    return file ? this.importText(file.text()) : Promise.resolve();
  }

  async importText(text: Promise<string>): Promise<void> {
    const result = parsePatternFile(await text);
    if (!result.ok) {
      this.error.set(result.error);
      return;
    }
    return this.attempt(async () => {
      const created = await this.api.create(result.pattern);
      await this.router.navigateByUrl(`/charts/${created.id}`);
    });
  }

  duplicate(chart: PatternSummary): Promise<void> {
    return this.attempt(async () => {
      const { title, craftType, width, height, palette, cells, symbols } = await this.api.get(
        chart.id,
      );
      const copy: Pattern = { title: `${title} copy`, craftType, width, height, palette, cells };
      const created = await this.api.create(symbols ? { ...copy, symbols } : copy);
      this.charts.update((charts) => [
        { ...chart, id: created.id, title: created.title },
        ...charts,
      ]);
      this.total.update((total) => total + 1);
    });
  }

  rename(chart: PatternSummary, title: string): Promise<void> {
    const trimmed = title.trim();
    if (!trimmed) {
      return Promise.resolve();
    }
    return this.attempt(async () => {
      const stored = await this.api.get(chart.id);
      await this.api.save(chart.id, { ...stored, title: trimmed }, stored.version);
      this.renaming.set(null);
      this.charts.update((charts) =>
        charts.map((entry) => (entry.id === chart.id ? { ...entry, title: trimmed } : entry)),
      );
    });
  }

  remove(chart: PatternSummary): Promise<void> {
    return this.attempt(async () => {
      await this.api.remove(chart.id);
      this.charts.update((charts) => charts.filter((entry) => entry.id !== chart.id));
      this.total.update((total) => total - 1);
    });
  }

  private async attempt(action: () => Promise<void>): Promise<void> {
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(apiErrorMessage(error));
    }
  }
}
