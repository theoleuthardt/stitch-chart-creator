import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  changedRegion,
  ChartTheme,
  drawChart,
  drawProgress,
  GUTTER,
} from '../../chart/chart-renderer';
import { Pattern } from '../../domain/pattern';
import { Progress } from '../../domain/progress';
import { cellAspect } from '../../domain/symbols';
import {
  CellRange,
  cellAt,
  cellHeight,
  centerOn,
  fitToWindow,
  panBy,
  pinch,
  Point,
  Viewport,
  zoomAt,
} from '../../domain/viewport';

/** How much one wheel step zooms. */
const WHEEL_ZOOM = 1.0015;

/**
 * The chart on one canvas. It owns the view (zoom and pan) and reports strokes as cells. A finger
 * draws, two fingers move the view; with a mouse the middle button or the space key moves it.
 */
@Component({
  selector: 'scc-chart-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas
      #canvas
      [class.panning]="spaceHeld()"
      (pointerdown)="pointerDown($event)"
      (pointermove)="pointerMove($event)"
      (pointerup)="pointerUp($event)"
      (pointercancel)="pointerCancel($event)"
      (contextmenu)="$event.preventDefault()"
    ></canvas>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }

    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      touch-action: none;
      cursor: crosshair;
    }

    canvas.panning {
      cursor: grab;
    }
  `,
})
export class ChartCanvas {
  readonly pattern = input.required<Pattern>();
  readonly progress = input<Progress | null>(null);
  readonly strokeStart = output<[number, number]>();
  readonly strokeMove = output<[number, number]>();
  readonly strokeEnd = output();
  readonly strokeCancel = output();

  readonly viewport = signal<Viewport>({ scale: 16, offsetX: GUTTER, offsetY: GUTTER });
  readonly spaceHeld = signal(false);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private context: CanvasRenderingContext2D | null = null;
  private theme: ChartTheme | null = null;
  private accent = '';
  private size = { width: 0, height: 0 };
  private drawn: Pattern | null = null;
  private fullRedrawQueued = false;
  private readonly pointers = new Map<number, Point>();
  private marked: CellRange | null = null;
  private stroking = false;
  private panning = false;

  constructor() {
    afterNextRender(() => {
      this.context = this.canvas().nativeElement.getContext('2d');
      this.theme = this.readTheme();
      const onWheel = (event: WheelEvent) => this.wheel(event);
      this.canvas().nativeElement.addEventListener('wheel', onWheel, { passive: false });
      const observer = new ResizeObserver(() => this.resize());
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        this.canvas().nativeElement.removeEventListener('wheel', onWheel);
      });
    });

    effect(() => {
      this.viewport();
      this.progress();
      this.queueFullRedraw();
    });
    effect(() => this.draw(this.pattern()));
  }

  /** Shows the whole chart. */
  fit(): void {
    const { width, height, craftType } = this.pattern();
    this.viewport.set(
      fitToWindow(
        width,
        height,
        this.size.width,
        this.size.height,
        GUTTER + 16,
        cellAspect(craftType),
      ),
    );
  }

  /** Brings a place to the middle and marks it, or marks the whole row without `x`. */
  focus({ x, y }: { x?: number; y: number }): void {
    this.viewport.update((view) =>
      centerOn(view, x ?? (this.pattern().width - 1) / 2, y, this.size.width, this.size.height),
    );
    this.marked = { fromX: x ?? 0, toX: x ?? this.pattern().width - 1, fromY: y, toY: y };
  }

  /** Zooms around the middle of the window. */
  zoom(factor: number): void {
    this.viewport.update((view) => zoomAt(view, factor, this.size.width / 2, this.size.height / 2));
  }

  pointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.canvas().nativeElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, [event.offsetX, event.offsetY]);
    if (this.pointers.size >= 2) {
      if (this.stroking) {
        this.stroking = false;
        this.strokeCancel.emit();
      }
      return;
    }
    if (event.button === 1 || event.button === 2 || this.spaceHeld()) {
      this.panning = true;
      return;
    }
    this.stroking = true;
    this.strokeStart.emit(cellAt(this.viewport(), event.offsetX, event.offsetY));
  }

  pointerMove(event: PointerEvent): void {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) {
      return;
    }
    const position: Point = [event.offsetX, event.offsetY];
    this.pointers.set(event.pointerId, position);
    const other = [...this.pointers].find(([id]) => id !== event.pointerId)?.[1];
    if (other) {
      this.viewport.update((view) => pinch(view, previous, other, position, other));
    } else if (this.panning) {
      this.viewport.update((view) =>
        panBy(view, position[0] - previous[0], position[1] - previous[1]),
      );
    } else if (this.stroking) {
      this.strokeMove.emit(cellAt(this.viewport(), position[0], position[1]));
    }
  }

  pointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    this.panning = false;
    if (this.stroking) {
      this.stroking = false;
      this.strokeEnd.emit();
    }
  }

  /** The system took the gesture away, for example because of a palm or a notification. */
  pointerCancel(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    this.panning = false;
    if (this.stroking) {
      this.stroking = false;
      this.strokeCancel.emit();
    }
  }

  @HostListener('document:keydown.space', ['$event'])
  spaceDown(event: Event): void {
    if ((event.target as HTMLElement).tagName === 'BODY') {
      event.preventDefault();
      this.spaceHeld.set(true);
    }
  }

  @HostListener('document:keyup.space')
  spaceUp(): void {
    this.spaceHeld.set(false);
  }

  private wheel(event: WheelEvent): void {
    event.preventDefault();
    this.viewport.update((view) =>
      zoomAt(view, WHEEL_ZOOM ** -event.deltaY, event.offsetX, event.offsetY),
    );
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.host.nativeElement;
    const element = this.canvas().nativeElement;
    const ratio = window.devicePixelRatio;
    const firstLayout = this.size.width === 0;
    this.size = { width: clientWidth, height: clientHeight };
    element.width = Math.round(clientWidth * ratio);
    element.height = Math.round(clientHeight * ratio);
    this.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (firstLayout) {
      this.fit();
    }
    this.drawFull();
  }

  private queueFullRedraw(): void {
    if (this.fullRedrawQueued || !this.context) {
      return;
    }
    this.fullRedrawQueued = true;
    requestAnimationFrame(() => {
      this.fullRedrawQueued = false;
      this.drawFull();
    });
  }

  private draw(pattern: Pattern): void {
    const previous = this.drawn;
    if (previous && previous !== pattern && this.marked) {
      this.marked = null;
      this.queueFullRedraw();
      return;
    }
    const region = previous ? changedRegion(previous, pattern) : 'all';
    if (region === 'all') {
      if (previous && previous.width !== pattern.width && this.size.width > 0) {
        this.fit();
      }
      this.queueFullRedraw();
    } else if (region && this.context && this.theme) {
      drawChart(this.context, pattern, this.viewport(), this.size, this.theme, region);
      this.drawn = pattern;
    } else {
      this.drawn = pattern;
    }
  }

  private drawFull(): void {
    if (!this.context || !this.theme) {
      return;
    }
    const pattern = this.pattern();
    const { width, height } = this.size;
    this.context.clearRect(0, 0, width, height);
    drawChart(this.context, pattern, this.viewport(), this.size, this.theme);
    this.drawn = pattern;
    if (this.marked) {
      this.drawMark(this.context, this.marked);
    }
    const progress = this.progress();
    if (progress) {
      drawProgress(
        this.context,
        pattern,
        this.viewport(),
        this.size,
        progress,
        this.theme,
        this.accent,
      );
    }
  }

  private drawMark(context: CanvasRenderingContext2D, mark: CellRange): void {
    const view = this.viewport();
    const rowHeight = cellHeight(view);
    context.strokeStyle = this.accent;
    context.lineWidth = 3;
    context.strokeRect(
      view.offsetX + mark.fromX * view.scale - 2,
      view.offsetY + mark.fromY * rowHeight - 2,
      (mark.toX - mark.fromX + 1) * view.scale + 4,
      (mark.toY - mark.fromY + 1) * rowHeight + 4,
    );
  }

  /** Canvas colours must be plain values, so the browser resolves the tokens on a probe first. */
  private readTheme(): ChartTheme {
    const probe = document.createElement('span');
    this.host.nativeElement.append(probe);
    const token = (name: string) => {
      probe.style.color = `var(${name})`;
      return getComputedStyle(probe).color;
    };
    this.accent = token('--color-accent');
    const theme = {
      paper: token('--chart-paper'),
      gridMinor: token('--chart-grid-minor'),
      gridMajor: token('--chart-grid-major'),
      label: token('--color-muted'),
      gutter: token('--color-surface'),
    };
    probe.remove();
    return theme;
  }
}
