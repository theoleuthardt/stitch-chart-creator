import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createPattern } from '../../domain/pattern';
import { ChartCanvas } from './chart-canvas';

class FakeResizeObserver {
  observe = () => undefined;
  disconnect = () => undefined;
}

const pointer = (pointerId: number, offsetX = 0, offsetY = 0, button = 0) =>
  ({ pointerId, offsetX, offsetY, button, preventDefault: () => undefined }) as PointerEvent;

describe('ChartCanvas gestures', () => {
  let canvas: ChartCanvas;
  let ref: ComponentRef<ChartCanvas>;
  const events: string[] = [];

  beforeEach(async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    HTMLCanvasElement.prototype.setPointerCapture = () => undefined;
    TestBed.configureTestingModule({ imports: [ChartCanvas] });
    const fixture = TestBed.createComponent(ChartCanvas);
    ref = fixture.componentRef;
    ref.setInput('pattern', createPattern(10, 10));
    await fixture.whenStable();
    canvas = fixture.componentInstance;
    canvas.viewport.set({ scale: 10, offsetX: 0, offsetY: 0 });
    events.length = 0;
    canvas.strokeStart.subscribe((cell) => events.push(`start ${cell.join(',')}`));
    canvas.strokeMove.subscribe((cell) => events.push(`move ${cell.join(',')}`));
    canvas.strokeEnd.subscribe(() => events.push('end'));
    canvas.strokeCancel.subscribe(() => events.push('cancel'));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('reports a stroke in cells', () => {
    canvas.pointerDown(pointer(1, 15, 25));
    canvas.pointerMove(pointer(1, 35, 25));
    canvas.pointerUp(pointer(1));

    expect(events).toEqual(['start 1,2', 'move 3,2', 'end']);
  });

  it('takes the stroke back when a second finger lands', () => {
    canvas.pointerDown(pointer(1, 15, 25));
    canvas.pointerDown(pointer(2, 45, 25));
    canvas.pointerUp(pointer(1));
    canvas.pointerUp(pointer(2));

    expect(events).toEqual(['start 1,2', 'cancel']);
  });

  it('starts no stroke with a third finger', () => {
    canvas.pointerDown(pointer(1, 15, 25));
    canvas.pointerDown(pointer(2, 45, 25));
    canvas.pointerDown(pointer(3, 75, 25));
    canvas.pointerUp(pointer(3));

    expect(events).toEqual(['start 1,2', 'cancel']);
  });

  it('takes the stroke back when the system aborts the gesture', () => {
    canvas.pointerDown(pointer(1, 15, 25));
    canvas.pointerCancel(pointer(1));

    expect(events).toEqual(['start 1,2', 'cancel']);
  });

  it('moves the view with the middle button and draws nothing', () => {
    canvas.pointerDown(pointer(1, 10, 10, 1));
    canvas.pointerMove(pointer(1, 30, 40));
    canvas.pointerUp(pointer(1));

    expect(events).toEqual([]);
    expect(canvas.viewport()).toMatchObject({ offsetX: 20, offsetY: 30 });
  });

  it('zooms with two fingers', () => {
    canvas.pointerDown(pointer(1, 100, 100));
    canvas.pointerDown(pointer(2, 200, 100));
    canvas.pointerMove(pointer(2, 300, 100));

    expect(canvas.viewport().scale).toBeCloseTo(20);
  });
});
