export interface LocalRowState {
  id: string;
  sync_status: string;
  updated_at: string;
}

/** Newer change wins. A pending local edit that is newer stays and is pushed later. */
export function shouldApplyServerRow(
  local: Pick<LocalRowState, 'updated_at'> | null,
  serverUpdatedAt: string
): boolean {
  return !local || serverUpdatedAt > local.updated_at;
}

/**
 * Rows another device deleted: synced locally but gone from the server.
 * Pending rows are local creations that were not pushed yet, so they stay.
 */
export function staleLocalIds(
  localRows: Pick<LocalRowState, 'id' | 'sync_status'>[],
  serverIds: ReadonlySet<string>
): string[] {
  return localRows
    .filter((row) => row.sync_status === 'synced' && !serverIds.has(row.id))
    .map((row) => row.id);
}

export type QueueHealth = 'synced' | 'pending' | 'error';

/** Status after a sync run, from what is still waiting in the queue. */
export function queueHealth(queue: { retry_count: number }[]): QueueHealth {
  if (queue.some((item) => item.retry_count > 0)) return 'error';
  if (queue.length > 0) return 'pending';
  return 'synced';
}
