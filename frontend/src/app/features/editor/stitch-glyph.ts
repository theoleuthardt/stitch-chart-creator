import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { StitchDrawing } from '../../domain/symbols';

/** Shows the drawing of a stitch as a small picture. */
@Component({
  selector: 'scc-stitch-glyph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 1 1" aria-hidden="true">
      @for (line of stitch().lines; track $index) {
        <line [attr.x1]="line[0]" [attr.y1]="line[1]" [attr.x2]="line[2]" [attr.y2]="line[3]" />
      }
      @for (circle of stitch().circles; track $index) {
        <circle [attr.cx]="circle[0]" [attr.cy]="circle[1]" [attr.r]="circle[2]" />
      }
    </svg>
  `,
  styles: `
    svg {
      display: block;
      width: 1.5rem;
      height: 1.5rem;
      fill: none;
      stroke: currentcolor;
      stroke-width: 0.08;
    }
  `,
})
export class StitchGlyph {
  readonly stitch = input.required<StitchDrawing>();
}
