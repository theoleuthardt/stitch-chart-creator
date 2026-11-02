import { Tool } from './editor-store';

/** What a key press does in the editor. */
export type Shortcut = { tool: Tool } | { action: 'undo' | 'redo' };

const TOOL_KEYS: Readonly<Record<string, Tool>> = {
  p: 'pencil',
  e: 'eraser',
  f: 'fill',
  i: 'picker',
  l: 'line',
  r: 'rectangle',
};

/** Finds the shortcut of a key press. Other combinations stay with the browser. */
export function shortcutFor(event: KeyboardEvent): Shortcut | null {
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z') {
      return { action: event.shiftKey ? 'redo' : 'undo' };
    }
    return key === 'y' ? { action: 'redo' } : null;
  }
  const tool = TOOL_KEYS[key];
  return tool ? { tool } : null;
}
