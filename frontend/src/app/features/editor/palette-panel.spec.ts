import { TestBed } from '@angular/core/testing';
import { createPattern } from '../../domain/pattern';
import { EditorStore } from './editor-store';
import { PalettePanel } from './palette-panel';

describe('PalettePanel', () => {
  const setup = async () => {
    TestBed.configureTestingModule({ imports: [PalettePanel], providers: [EditorStore] });
    const store = TestBed.inject(EditorStore);
    store.load({
      ...createPattern(2, 1),
      palette: ['#ff0000', '#00ff00'],
      cells: [1, 0],
    });
    const fixture = TestBed.createComponent(PalettePanel);
    await fixture.whenStable();
    return { fixture, store, element: fixture.nativeElement as HTMLElement };
  };
  const click = (element: HTMLElement, label: string) => {
    element.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)?.click();
  };

  it('shows the colours with their usage', async () => {
    const { element } = await setup();

    expect(element.querySelector('li')?.textContent).toContain('#ff0000');
    expect(element.querySelector('li small')?.textContent).toBe('1');
  });

  it('selects the colour to draw with', async () => {
    const { element, store } = await setup();

    click(element, 'Draw with #00ff00');

    expect(store.color()).toBe(2);
  });

  it('adds a colour and makes it active', async () => {
    const { fixture, store } = await setup();

    fixture.componentInstance.add();

    expect(store.pattern().palette).toHaveLength(3);
    expect(store.color()).toBe(3);
  });

  it('removes an unused colour at once', async () => {
    const { element, store } = await setup();

    click(element, 'Remove #00ff00');

    expect(store.pattern().palette).toEqual(['#ff0000']);
  });

  it('asks before removing a colour in use', async () => {
    const { fixture, element, store } = await setup();

    click(element, 'Remove #ff0000');
    await fixture.whenStable();

    expect(store.pattern().palette).toHaveLength(2);
    expect(element.querySelector('[role="alertdialog"]')?.textContent).toContain('1 stitches');
  });

  it('can replace the stitches of a removed colour', async () => {
    const { fixture, element, store } = await setup();

    click(element, 'Remove #ff0000');
    await fixture.whenStable();
    click(element, 'Replace with #00ff00');

    expect(store.pattern().palette).toEqual(['#00ff00']);
    expect(store.pattern().cells).toEqual([1, 0]);
  });

  it('merges the active colour and keeps drawing with the target', async () => {
    const { fixture, store } = await setup();
    store.setColor(1);

    fixture.componentInstance.merge(2);

    expect(store.pattern().palette).toEqual(['#00ff00']);
    expect(store.pattern().cells).toEqual([1, 0]);
    expect(store.color()).toBe(1);
  });

  it('ignores an invalid colour', async () => {
    const { fixture, store } = await setup();

    fixture.componentInstance.setColor(1, 'nonsense');

    expect(store.pattern().palette[0]).toBe('#ff0000');
  });
});
