import { describe, expect, it, jest } from '@jest/globals';
import { notifySyncQueued, setOnSyncQueued } from '../queueEvents';

describe('queueEvents', () => {
  it('notifies the registered listener', () => {
    const listener = jest.fn();
    setOnSyncQueued(listener);
    notifySyncQueued();
    expect(listener).toHaveBeenCalledTimes(1);
    setOnSyncQueued(null);
  });

  it('does nothing when no listener is registered', () => {
    setOnSyncQueued(null);
    expect(() => notifySyncQueued()).not.toThrow();
  });
});
