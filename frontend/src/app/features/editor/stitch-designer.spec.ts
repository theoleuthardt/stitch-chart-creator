import { TestBed } from '@angular/core/testing';
import { snapToGrid, StitchDesigner } from './stitch-designer';

describe('snapToGrid', () => {
  it('snaps to eighths and stays inside the square', () => {
    expect(snapToGrid(0.13)).toBe(0.125);
    expect(snapToGrid(0.49)).toBe(0.5);
    expect(snapToGrid(-0.2)).toBe(0);
    expect(snapToGrid(1.3)).toBe(1);
  });
});

describe('StitchDesigner', () => {
  const setup = () => {
    TestBed.configureTestingModule({ imports: [StitchDesigner] });
    return TestBed.createComponent(StitchDesigner).componentInstance;
  };

  it('makes a line from two points', () => {
    const designer = setup();

    designer.place(0.1, 0.1);
    expect(designer.lines()).toEqual([]);
    designer.place(0.9, 0.9);

    expect(designer.lines()).toEqual([[0.125, 0.125, 0.875, 0.875]]);
  });

  it('makes a circle from its centre and a point on the rim', () => {
    const designer = setup();
    designer.mode.set('circle');

    designer.place(0.5, 0.5);
    designer.place(0.75, 0.5);

    expect(designer.circles()).toEqual([[0.5, 0.5, 0.25]]);
  });

  it('ignores a line of no length', () => {
    const designer = setup();

    designer.place(0.5, 0.5);
    designer.place(0.5, 0.5);

    expect(designer.lines()).toEqual([]);
  });

  it('ignores a circle that cannot fit at the edge', () => {
    const designer = setup();
    designer.mode.set('circle');

    designer.place(0, 0);
    designer.place(0.5, 0.5);

    expect(designer.circles()).toEqual([]);
  });

  it('takes the last shape back', () => {
    const designer = setup();
    designer.place(0, 0);
    designer.place(1, 1);

    designer.undo();

    expect(designer.lines()).toEqual([]);
  });

  it('is ready with a name, an abbreviation and a drawing', () => {
    const designer = setup();
    expect(designer.ready()).toBe(false);

    designer.name.set('Bobble');
    designer.abbreviation.set('bo');
    expect(designer.ready()).toBe(false);

    designer.place(0, 0);
    designer.place(1, 1);
    expect(designer.ready()).toBe(true);

    designer.abbreviation.set('<b>');
    expect(designer.ready()).toBe(false);
  });

  it('hands over the finished stitch and starts over', () => {
    const designer = setup();
    const saved: unknown[] = [];
    designer.saved.subscribe((stitch) => saved.push(stitch));
    designer.name.set('Bobble');
    designer.abbreviation.set('bo');
    designer.place(0, 0);
    designer.place(1, 1);

    designer.save();

    expect(saved).toEqual([
      { name: 'Bobble', abbreviation: 'bo', lines: [[0, 0, 1, 1]], circles: [] },
    ]);
    expect(designer.lines()).toEqual([]);
    expect(designer.name()).toBe('');
  });
});
