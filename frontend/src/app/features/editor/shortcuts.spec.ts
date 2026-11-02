import { shortcutFor } from './shortcuts';

const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

describe('shortcutFor', () => {
  it('maps letters to tools', () => {
    expect(shortcutFor(key({ key: 'p' }))).toEqual({ tool: 'pencil' });
    expect(shortcutFor(key({ key: 'e' }))).toEqual({ tool: 'eraser' });
    expect(shortcutFor(key({ key: 'f' }))).toEqual({ tool: 'fill' });
    expect(shortcutFor(key({ key: 'i' }))).toEqual({ tool: 'picker' });
    expect(shortcutFor(key({ key: 'l' }))).toEqual({ tool: 'line' });
    expect(shortcutFor(key({ key: 'r' }))).toEqual({ tool: 'rectangle' });
  });

  it('maps undo and redo with ctrl and with cmd', () => {
    expect(shortcutFor(key({ key: 'z', ctrlKey: true }))).toEqual({ action: 'undo' });
    expect(shortcutFor(key({ key: 'z', metaKey: true }))).toEqual({ action: 'undo' });
    expect(shortcutFor(key({ key: 'Z', ctrlKey: true, shiftKey: true }))).toEqual({
      action: 'redo',
    });
    expect(shortcutFor(key({ key: 'y', ctrlKey: true }))).toEqual({ action: 'redo' });
  });

  it('leaves browser shortcuts alone', () => {
    expect(shortcutFor(key({ key: 'r', ctrlKey: true }))).toBeNull();
    expect(shortcutFor(key({ key: 'f', metaKey: true }))).toBeNull();
  });

  it('ignores other keys', () => {
    expect(shortcutFor(key({ key: 'q' }))).toBeNull();
  });
});
