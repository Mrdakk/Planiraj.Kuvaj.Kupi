import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createAutoSync } from '../autoSync';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('createAutoSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('batches local changes into one sync after the debounce', async () => {
    const sync = jest.fn(async () => undefined);
    const autoSync = createAutoSync(
      { sync, isOnline: () => true, setStatus: jest.fn() },
      { debounceMs: 800 }
    );

    autoSync.notifyLocalChange();
    autoSync.notifyLocalChange();
    autoSync.notifyLocalChange();
    expect(sync).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(800);
    expect(sync).toHaveBeenCalledTimes(1);
    autoSync.stop();
  });

  it('marks status pending as soon as a local change is queued', () => {
    const setStatus = jest.fn();
    const autoSync = createAutoSync({
      sync: async () => undefined,
      isOnline: () => true,
      setStatus,
    });

    autoSync.notifyLocalChange();
    expect(setStatus).toHaveBeenCalledWith('pending');
    autoSync.stop();
  });

  it('does not sync while offline', async () => {
    const sync = jest.fn(async () => undefined);
    const autoSync = createAutoSync(
      { sync, isOnline: () => false, setStatus: jest.fn() },
      { debounceMs: 800 }
    );

    autoSync.notifyLocalChange();
    await jest.advanceTimersByTimeAsync(800);
    expect(sync).not.toHaveBeenCalled();
    autoSync.stop();
  });

  it('runs immediately when asked, without waiting for debounce', async () => {
    const sync = jest.fn(async () => undefined);
    const autoSync = createAutoSync(
      { sync, isOnline: () => true, setStatus: jest.fn() },
      { debounceMs: 800 }
    );

    await autoSync.runNow();
    expect(sync).toHaveBeenCalledTimes(1);
    autoSync.stop();
  });

  it('runs a follow-up sync when another run is requested while one is in flight', async () => {
    jest.useRealTimers();
    const first = deferred();
    const second = deferred();
    let calls = 0;
    const sync = jest.fn(() => {
      calls += 1;
      return calls === 1 ? first.promise : second.promise;
    });
    const autoSync = createAutoSync({
      sync,
      isOnline: () => true,
      setStatus: jest.fn(),
    });

    const firstRun = autoSync.runNow();
    const secondRun = autoSync.runNow();
    expect(sync).toHaveBeenCalledTimes(1);

    first.resolve();
    second.resolve();
    await firstRun;
    await secondRun;
    expect(sync).toHaveBeenCalledTimes(2);
    autoSync.stop();
  });

  it('polls on an interval while started', async () => {
    const sync = jest.fn(async () => undefined);
    const autoSync = createAutoSync(
      { sync, isOnline: () => true, setStatus: jest.fn() },
      { intervalMs: 30_000 }
    );

    autoSync.start();
    expect(sync).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(sync).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(sync).toHaveBeenCalledTimes(2);
    autoSync.stop();
  });

  it('stops polling after stop', async () => {
    const sync = jest.fn(async () => undefined);
    const autoSync = createAutoSync(
      { sync, isOnline: () => true, setStatus: jest.fn() },
      { intervalMs: 30_000 }
    );

    autoSync.start();
    autoSync.stop();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(sync).not.toHaveBeenCalled();
  });

  it('keeps a scheduled local sync after polling is paused', async () => {
    const sync = jest.fn(async () => undefined);
    const autoSync = createAutoSync(
      { sync, isOnline: () => true, setStatus: jest.fn() },
      { debounceMs: 800, intervalMs: 30_000 }
    );

    autoSync.start();
    autoSync.notifyLocalChange();
    autoSync.pausePolling();
    await jest.advanceTimersByTimeAsync(800);
    expect(sync).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(sync).toHaveBeenCalledTimes(1);
    autoSync.stop();
  });

  it('calls onComplete after a successful sync but not after a failed one', async () => {
    const onComplete = jest.fn();
    const autoSync = createAutoSync({
      sync: async () => {
        throw new Error('offline');
      },
      isOnline: () => true,
      setStatus: jest.fn(),
      onComplete,
    });

    await autoSync.runNow();
    expect(onComplete).not.toHaveBeenCalled();

    const ok = createAutoSync({
      sync: async () => undefined,
      isOnline: () => true,
      setStatus: jest.fn(),
      onComplete,
    });
    await ok.runNow();
    expect(onComplete).toHaveBeenCalledTimes(1);
    autoSync.stop();
    ok.stop();
  });
});
