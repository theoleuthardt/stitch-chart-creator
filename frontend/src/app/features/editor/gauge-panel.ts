import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finishedSize, Gauge, GaugeUnit, requiredStitches, sizeOnFabric } from '../../domain/gauge';
import { EditorStore } from './editor-store';

/** The largest gauge the backend accepts. */
const MAX_GAUGE = 1000;

/** Common Aida counts. */
const FABRIC_COUNTS = [11, 14, 16, 18, 22];

/** How big the open chart gets, and how many stitches a wanted size takes. */
@Component({
  selector: 'scc-gauge-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>Gauge</h3>
    @if (crossStitch()) {
      <label class="field" for="gauge-fabric">
        <span>Fabric (Aida count)</span>
        <select id="gauge-fabric" (change)="fabricCount.set(+$any($event.target).value)">
          @for (count of counts; track count) {
            <option [value]="count" [selected]="count === fabricCount()">{{ count }}-count</option>
          }
        </select>
      </label>
      <label class="field" for="gauge-margin">
        <span>Margin in cm</span>
        <input
          id="gauge-margin"
          type="number"
          min="0"
          step="0.5"
          [value]="margin()"
          (input)="setMargin($any($event.target).valueAsNumber)"
        />
      </label>
      <p role="status">
        {{ fabric().widthCm.toFixed(1) }} × {{ fabric().heightCm.toFixed(1) }} cm ({{
          fabric().widthIn.toFixed(1)
        }}
        × {{ fabric().heightIn.toFixed(1) }} in)
      </p>
      <p class="muted">
        Fabric to cut: {{ fabric().fabricWidthCm.toFixed(1) }} ×
        {{ fabric().fabricHeightCm.toFixed(1) }} cm
      </p>
    } @else {
      <div class="pair">
        <label class="field" for="gauge-stitches">
          <span>Stitches</span>
          <input
            id="gauge-stitches"
            type="number"
            min="0"
            step="0.5"
            [value]="gauge().stitchesPerUnit"
            (change)="update({ stitchesPerUnit: $any($event.target).valueAsNumber })"
          />
        </label>
        <label class="field" for="gauge-rows">
          <span>Rows</span>
          <input
            id="gauge-rows"
            type="number"
            min="0"
            step="0.5"
            [value]="gauge().rowsPerUnit"
            (change)="update({ rowsPerUnit: $any($event.target).valueAsNumber })"
          />
        </label>
      </div>
      <label class="field" for="gauge-unit">
        <span>Per</span>
        <select id="gauge-unit" (change)="update({ unit: $any($event.target).value })">
          @for (option of units; track option.value) {
            <option [value]="option.value" [selected]="option.value === gauge().unit">
              {{ option.label }}
            </option>
          }
        </select>
      </label>
      <p role="status">
        {{ size().widthCm.toFixed(1) }} × {{ size().heightCm.toFixed(1) }} cm ({{
          size().widthIn.toFixed(1)
        }}
        × {{ size().heightIn.toFixed(1) }} in)
      </p>
      <div class="pair">
        <label class="field" for="gauge-wanted-width">
          <span>Wanted width</span>
          <input
            id="gauge-wanted-width"
            type="number"
            min="0"
            [value]="wantedWidth()"
            (input)="wantedWidth.set($any($event.target).valueAsNumber)"
          />
        </label>
        <label class="field" for="gauge-wanted-height">
          <span>Wanted height</span>
          <input
            id="gauge-wanted-height"
            type="number"
            min="0"
            [value]="wantedHeight()"
            (input)="wantedHeight.set($any($event.target).valueAsNumber)"
          />
        </label>
      </div>
      <label class="field" for="gauge-wanted-unit">
        <span>In</span>
        <select id="gauge-wanted-unit" (change)="wantedUnit.set($any($event.target).value)">
          <option value="cm">Centimetres</option>
          <option value="in">Inches</option>
        </select>
      </label>
      @if (required(); as needed) {
        <p>Takes {{ needed.stitches }} stitches and {{ needed.rows }} rows.</p>
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

    .field {
      margin-bottom: 0.5rem;
    }

    .pair {
      display: flex;
      gap: 0.5rem;
    }

    .pair input {
      width: 100%;
    }

    p {
      margin: 0.25rem 0;
    }
  `,
})
export class GaugePanel {
  private readonly store = inject(EditorStore);

  readonly counts = FABRIC_COUNTS;
  readonly units: readonly { value: GaugeUnit; label: string }[] = [
    { value: 'cm10', label: '10 cm' },
    { value: 'cm', label: '1 cm' },
    { value: 'in4', label: '4 inches' },
    { value: 'in', label: '1 inch' },
  ];

  readonly fabricCount = signal(14);
  readonly margin = signal(5);
  readonly wantedWidth = signal(50);
  readonly wantedHeight = signal(50);
  readonly wantedUnit = signal<'cm' | 'in'>('cm');

  readonly crossStitch = computed(() => this.store.pattern().craftType === 'crossStitch');
  readonly gauge = computed<Gauge>(
    () => this.store.pattern().gauge ?? { stitchesPerUnit: 22, rowsPerUnit: 30, unit: 'cm10' },
  );
  readonly size = computed(() => {
    const { width, height } = this.store.pattern();
    return finishedSize(width, height, this.gauge());
  });
  readonly fabric = computed(() => {
    const { width, height } = this.store.pattern();
    return sizeOnFabric(width, height, this.fabricCount(), this.margin());
  });
  readonly required = computed(() => {
    const width = this.wantedWidth();
    const height = this.wantedHeight();
    return Number.isFinite(width) && Number.isFinite(height)
      ? requiredStitches(width, height, this.wantedUnit(), this.gauge())
      : null;
  });

  setMargin(margin: number): void {
    if (Number.isFinite(margin) && margin >= 0) {
      this.margin.set(margin);
    }
  }

  /** Stores a changed gauge with the chart. An impossible value is not taken over. */
  update(change: Partial<Gauge>): void {
    const gauge = { ...this.gauge(), ...change };
    const valid = (value: number) => value > 0 && value <= MAX_GAUGE;
    if (valid(gauge.stitchesPerUnit) && valid(gauge.rowsPerUnit)) {
      this.store.apply({ ...this.store.pattern(), gauge });
    }
  }
}
