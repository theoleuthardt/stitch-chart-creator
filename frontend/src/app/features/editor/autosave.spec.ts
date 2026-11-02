import { HttpErrorResponse } from '@angular/common/http';
import { createPattern, Pattern, setCell } from '../../domain/pattern';
import { Autosave, AUTOSAVE_DELAY, RETRY_DELAY } from './autosave';
import { EditorStore } from './editor-store';

describe('Autosave', () => {
  let store: EditorStore;
  let save: ReturnType<typeof vi.fn<(pattern: Pattern, version: number) => Promise<number>>>;
  let autosave: Autosave;

  const draw = (x: number) => {
    store.apply(setCell(store.pattern(), x, 0, 1));
    autosave.changed();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    store = new EditorStore();
    store.load(createPattern(4, 1));
    save = vi.fn((_pattern: Pattern, version: number) => Promise.resolve(version + 1));
    autosave = new Autosave(store, save, 3);
  });

  afterEach(() => {
    autosave.stop();
    vi.useRealTimers();
  });

  it('starts as saved', () => {
    expect(autosave.status()).toBe('saved');
  });

  it('waits for a pause before it saves', async () => {
    draw(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY - 1);
    expect(save).not.toHaveBeenCalled();
    expect(autosave.status()).toBe('pending');

    await vi.advanceTimersByTimeAsync(1);

    expect(save).toHaveBeenCalledExactlyOnceWith(store.pattern(), 3);
    expect(autosave.status()).toBe('saved');
    expect(store.dirty()).toBe(false);
  });

  it('bundles quick changes into one save', async () => {
    draw(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY / 2);
    draw(1);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('uses the version of the last save for the next one', async () => {
    draw(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    draw(1);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);

    expect(save.mock.calls[1]?.[1]).toBe(4);
  });

  it('saves again when something changed during a save', async () => {
    let finish: (version: number) => void = () => undefined;
    save.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    draw(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    draw(1);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(save).toHaveBeenCalledTimes(1);

    finish(4);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);

    expect(save).toHaveBeenCalledTimes(2);
    expect(autosave.status()).toBe('saved');
    expect(store.dirty()).toBe(false);
  });

  it('keeps the changes and retries when the connection is lost', async () => {
    save.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
    draw(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(autosave.status()).toBe('offline');
    expect(store.dirty()).toBe(true);

    await vi.advanceTimersByTimeAsync(RETRY_DELAY);

    expect(save).toHaveBeenCalledTimes(2);
    expect(autosave.status()).toBe('saved');
    expect(store.dirty()).toBe(false);
  });

  it('stops saving on a conflict', async () => {
    save.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
    draw(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
    expect(autosave.status()).toBe('conflict');

    draw(1);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY * 3);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('overwrites after a conflict with the newest version', async () => {
    save.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
    draw(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);

    autosave.overwrite(9);
    await vi.advanceTimersByTimeAsync(0);

    expect(save.mock.calls[1]?.[1]).toBe(9);
    expect(autosave.status()).toBe('saved');
  });

  it('shows another failure and does not retry forever on a rejected chart', async () => {
    save.mockRejectedValueOnce(new HttpErrorResponse({ status: 400 }));
    draw(0);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);

    expect(autosave.status()).toBe('failed');
    await vi.advanceTimersByTimeAsync(RETRY_DELAY * 3);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('saves what is pending right away when asked to flush', async () => {
    draw(0);

    autosave.flush();
    await vi.advanceTimersByTimeAsync(0);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('has nothing to flush when everything is saved', async () => {
    autosave.flush();
    await vi.advanceTimersByTimeAsync(0);

    expect(save).not.toHaveBeenCalled();
  });
});
