import { TestBed } from '@angular/core/testing';
import { createPattern } from '../../domain/pattern';
import { ChartSettings } from './chart-settings';
import { EditorStore } from './editor-store';

describe('ChartSettings', () => {
  const setup = () => {
    TestBed.configureTestingModule({ imports: [ChartSettings], providers: [EditorStore] });
    const store = TestBed.inject(EditorStore);
    store.load(createPattern(4, 4, 'crossStitch', 'Rose'));
    return { store, settings: TestBed.createComponent(ChartSettings).componentInstance };
  };

  it('offers to resize only for a new valid size', () => {
    const { settings } = setup();

    expect(settings.canResize()).toBe(false);
    settings.width.set(8);
    expect(settings.canResize()).toBe(true);
    settings.width.set(0);
    expect(settings.canResize()).toBe(false);
    settings.width.set(Number.NaN);
    expect(settings.canResize()).toBe(false);
    settings.width.set(2.5);
    expect(settings.canResize()).toBe(false);
  });

  it('resizes the chart as one undoable step', () => {
    const { store, settings } = setup();
    settings.width.set(8);
    settings.height.set(2);

    settings.applySize();

    expect(store.pattern().width).toBe(8);
    expect(store.pattern().height).toBe(2);
    store.undo();
    expect(store.pattern().width).toBe(4);
  });

  it('renames the chart', () => {
    const { store, settings } = setup();

    settings.rename('  Tulip ');

    expect(store.pattern().title).toBe('Tulip');
  });

  it('refuses an empty title', () => {
    const { store, settings } = setup();

    settings.rename('   ');

    expect(store.pattern().title).toBe('Rose');
    expect(store.canUndo()).toBe(false);
  });
});
