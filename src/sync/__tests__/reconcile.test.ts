import { describe, expect, it } from '@jest/globals';
import { queueHealth, shouldApplyServerRow, staleLocalIds } from '../reconcile';

describe('shouldApplyServerRow', () => {
  it('applies new rows and newer server edits', () => {
    expect(shouldApplyServerRow(null, '2026-09-01')).toBe(true);
    expect(shouldApplyServerRow({ updated_at: '2026-09-01' }, '2026-09-02')).toBe(true);
  });

  it('keeps a newer local edit', () => {
    expect(shouldApplyServerRow({ updated_at: '2026-09-03' }, '2026-09-02')).toBe(false);
  });
});

describe('staleLocalIds', () => {
  it('returns synced rows missing on the server, never pending ones', () => {
    const local = [
      { id: 'kept', sync_status: 'synced' },
      { id: 'deleted-elsewhere', sync_status: 'synced' },
      { id: 'new-offline', sync_status: 'pending' },
    ];
    expect(staleLocalIds(local, new Set(['kept']))).toEqual(['deleted-elsewhere']);
  });
});

describe('queueHealth', () => {
  it('is synced only when the queue is empty', () => {
    expect(queueHealth([])).toBe('synced');
    expect(queueHealth([{ retry_count: 0 }])).toBe('pending');
    expect(queueHealth([{ retry_count: 0 }, { retry_count: 2 }])).toBe('error');
  });
});
