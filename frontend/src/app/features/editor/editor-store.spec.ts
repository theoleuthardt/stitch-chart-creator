import { createPattern, Pattern, setCell } from '../../domain/pattern';
import { EditorStore } from './editor-store';

const drawn = (pattern: Pattern, x: number) => setCell(pattern, x, 0, 1);

describe('EditorStore', () => {
  let store: EditorStore;
  let start: Pattern;

  beforeEach(() => {
    store = new EditorStore();
    start = createPattern(4, 1);
    store.load(start);
  });

  it('starts clean with nothing to undo', () => {
    expect(store.pattern()).toBe(start);
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(false);
    expect(store.dirty()).toBe(false);
  });

  it('starts with the pencil and the first colour', () => {
    expect(store.tool()).toBe('pencil');
    expect(store.color()).toBe(1);
  });

  it('remembers the chosen tool and colour', () => {
    store.setTool('fill');
    store.setColor(2);

    expect(store.tool()).toBe('fill');
    expect(store.color()).toBe(2);
  });

  it('applies a change and can undo and redo it', () => {
    const changed = drawn(start, 0);

    store.apply(changed);
    expect(store.pattern()).toBe(changed);
    expect(store.canUndo()).toBe(true);

    store.undo();
    expect(store.pattern()).toBe(start);
    expect(store.canRedo()).toBe(true);

    store.redo();
    expect(store.pattern()).toBe(changed);
  });

  it('ignores a change that changes nothing', () => {
    store.apply(store.pattern());

    expect(store.canUndo()).toBe(false);
  });

  it('forgets the redo steps after a new change', () => {
    store.apply(drawn(start, 0));
    store.undo();

    store.apply(drawn(start, 1));

    expect(store.canRedo()).toBe(false);
  });

  it('treats a whole stroke as one step', () => {
    store.beginStroke();
    store.apply(drawn(store.pattern(), 0));
    store.apply(drawn(store.pattern(), 1));
    store.apply(drawn(store.pattern(), 2));
    store.endStroke();

    store.undo();

    expect(store.pattern()).toBe(start);
    expect(store.canUndo()).toBe(false);
  });

  it('records no step for a stroke that changed nothing', () => {
    store.beginStroke();
    store.endStroke();

    expect(store.canUndo()).toBe(false);
  });

  it('keeps separate strokes apart', () => {
    store.beginStroke();
    store.apply(drawn(store.pattern(), 0));
    store.endStroke();
    const afterFirst = store.pattern();
    store.beginStroke();
    store.apply(drawn(store.pattern(), 1));
    store.endStroke();

    store.undo();

    expect(store.pattern()).toBe(afterFirst);
  });

  it('forgets the oldest steps beyond the step limit', () => {
    for (let step = 0; step < 150; step++) {
      store.apply({ ...store.pattern(), title: `Step ${step}` });
    }

    let undone = 0;
    while (store.canUndo()) {
      store.undo();
      undone++;
    }

    expect(undone).toBe(100);
    expect(store.pattern().title).toBe('Step 49');
  });

  it('keeps a big chart from filling the memory', () => {
    const big = createPattern(2000, 2000);
    store.load(big);
    for (let step = 0; step < 20; step++) {
      store.apply({ ...store.pattern(), cells: [...store.pattern().cells] });
    }

    let undone = 0;
    while (store.canUndo()) {
      store.undo();
      undone++;
    }

    expect(undone).toBeLessThan(20);
    expect(undone).toBeGreaterThan(0);
  });

  it('counts cells that several steps share only once', () => {
    const big = createPattern(2000, 2000);
    store.load(big);
    for (let step = 0; step < 20; step++) {
      store.apply({ ...store.pattern(), title: `Step ${step}` });
    }

    let undone = 0;
    while (store.canUndo()) {
      store.undo();
      undone++;
    }

    expect(undone).toBe(20);
  });

  it('falls back to an existing colour when undo shrinks the palette', () => {
    const small = { ...start, palette: ['#000000'] };
    store.load(small);
    store.apply({ ...small, palette: ['#000000', '#ffffff'] });
    store.setColor(2);

    store.undo();

    expect(store.color()).toBe(1);
  });

  it('falls back to an existing colour when redo shrinks the palette', () => {
    const large = { ...start, palette: ['#000000', '#ffffff'] };
    store.load(large);
    store.apply({ ...large, palette: ['#000000'] });
    store.undo();
    store.setColor(2);

    store.redo();

    expect(store.color()).toBe(1);
  });

  it('ignores undo and redo in the middle of a stroke', () => {
    store.apply(drawn(start, 0));
    const afterFirst = store.pattern();
    store.undo();
    store.redo();
    store.undo();
    store.beginStroke();
    store.apply(drawn(store.pattern(), 1));
    const during = store.pattern();

    store.redo();
    expect(store.pattern()).toBe(during);
    store.undo();
    expect(store.pattern()).toBe(during);

    store.endStroke();
    store.undo();
    expect(store.pattern()).toBe(start);
    expect(afterFirst).not.toBe(start);
  });

  it('becomes dirty with a change and clean after saving', () => {
    store.apply(drawn(start, 0));
    expect(store.dirty()).toBe(true);

    store.markSaved(store.pattern());
    expect(store.dirty()).toBe(false);
  });

  it('stays dirty when something changed during the save', () => {
    store.apply(drawn(start, 0));
    const saved = store.pattern();
    store.apply(drawn(store.pattern(), 1));

    store.markSaved(saved);

    expect(store.dirty()).toBe(true);
  });

  it('is clean again after undoing back to the saved state', () => {
    store.apply(drawn(start, 0));
    store.undo();

    expect(store.dirty()).toBe(false);
  });

  it('forgets the history when another chart is loaded', () => {
    store.apply(drawn(start, 0));

    store.load(createPattern(2, 2));

    expect(store.canUndo()).toBe(false);
    expect(store.dirty()).toBe(false);
  });

  it('falls back to a colour that exists when the palette shrinks', () => {
    const palette = { ...start, palette: ['#000000', '#ffffff'] };
    store.load(palette);
    store.setColor(2);

    store.apply({ ...palette, palette: ['#000000'] });

    expect(store.color()).toBe(1);
  });
});
