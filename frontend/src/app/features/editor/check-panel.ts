import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { checkPattern, Finding, findingText } from '../../domain/checks';
import { EditorStore } from './editor-store';

/** The most findings shown at once. */
const MAX_SHOWN = 100;

/** A place on the chart: a cell, or a whole row without `x`. */
export interface ChartPlace {
  x?: number;
  y: number;
}

/** Checks the chart on request and jumps to what it finds. */
@Component({
  selector: 'scc-check-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Check</h3>
    <button class="button" type="button" (click)="run()">Check chart</button>
    @if (findings(); as all) {
      @if (all.length === 0) {
        <p class="muted" role="status">No problems found.</p>
      } @else {
        <ul>
          @for (finding of shown(); track $index) {
            <li>
              <button class="finding" type="button" (click)="select(finding)">
                {{ text(finding) }}
              </button>
            </li>
          }
        </ul>
        @if (all.length > shown().length) {
          <p class="muted">and {{ all.length - shown().length }} more</p>
        }
      }
    }
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

    ul {
      max-height: 14rem;
      margin: 0.5rem 0 0;
      padding: 0;
      overflow: auto;
      list-style: none;
    }

    .finding {
      width: 100%;
      padding: 0.25rem;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .finding:hover {
      color: var(--color-accent);
    }

    p {
      margin: 0.5rem 0 0;
    }
  `,
})
export class CheckPanel {
  private readonly store = inject(EditorStore);

  readonly jump = output<ChartPlace>();
  readonly findings = signal<Finding[] | null>(null);
  readonly shown = computed(() => (this.findings() ?? []).slice(0, MAX_SHOWN));

  run(): void {
    this.findings.set(checkPattern(this.store.pattern()));
  }

  text(finding: Finding): string {
    return findingText(finding, this.store.pattern());
  }

  /** Findings about colours have no place on the chart, so they do not jump. */
  select(finding: Finding): void {
    if (finding.kind === 'isolated') {
      this.jump.emit({ x: finding.x, y: finding.y });
    } else if (finding.kind === 'unevenRow') {
      this.jump.emit({ y: finding.y });
    }
  }
}
