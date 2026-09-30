import { supabase, requireSupabase } from '@/lib/supabase';
import {
  getPendingSyncQueue,
  getAllSyncQueue,
  removeSyncQueueItem,
  incrementSyncQueueRetry,
  updateSyncState,
  withTransaction,
  getDatabase,
  nowISO,
} from '@/database/repository';
import type { SQLiteDatabase, SQLiteSyncQueueRow } from '@/database/types';
import type { TableName } from '@/database/repository';
import { getHouseholdState } from '@/features/household/state';
import { useAppStore } from '@/store/appStore';
import { toServerPayload } from './payload';
import { queueHealth, shouldApplyServerRow, staleLocalIds, type LocalRowState } from './reconcile';

export interface SyncEngine {
  sync(): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
}

/** Parents before children, so foreign keys hold while inserting. */
const PULL_ORDER: TableName[] = [
  'ingredients',
  'ingredient_aliases',
  'recipes',
  'recipe_ingredients',
  'meal_plans',
  'meals',
  'pantry_items',
  'shopping_lists',
  'shopping_items',
  'consumption_logs',
  'favorites',
];

const PAGE_SIZE = 1000;

export function createSyncEngine(): SyncEngine {
  async function push(): Promise<void> {
    if (!supabase) return;
    const household = await getHouseholdState();
    if (!household) return;
    const queue = await getPendingSyncQueue();
    for (const item of queue) {
      await pushQueueItem(item, household.householdId);
    }
  }

  async function pull(): Promise<void> {
    if (!supabase) return;
    const household = await getHouseholdState();
    if (!household) return;

    const serverIdsByTable = new Map<TableName, Set<string>>();
    for (const tableName of PULL_ORDER) {
      const ids = await pullTable(tableName);
      if (ids) serverIdsByTable.set(tableName, ids);
    }
    // Children first, so a removed recipe does not block on its ingredient rows.
    for (const tableName of [...PULL_ORDER].reverse()) {
      const ids = serverIdsByTable.get(tableName);
      if (ids) await purgeDeletedRows(tableName, ids);
    }
  }

  async function sync(): Promise<void> {
    await updateSyncState({ status: 'syncing' });
    useAppStore.getState().setSyncStatus('syncing');

    try {
      if (!supabase) {
        await updateSyncState({ status: 'idle' });
        useAppStore.getState().setSyncStatus('offline');
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        await updateSyncState({ status: 'idle' });
        useAppStore.getState().setSyncStatus('offline');
        return;
      }

      await pull();
      await push();

      const remaining = await getAllSyncQueue();
      const health = queueHealth(remaining);
      await updateSyncState({
        status: health === 'error' ? 'error' : 'idle',
        pending_count: remaining.length,
        ...(health === 'synced' ? { last_synced_at: nowISO() } : {}),
      });
      useAppStore.getState().setSyncStatus(health);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateSyncState({ status: 'error' });
      useAppStore.getState().setSyncStatus('error');
      console.error('Sync failed:', message);
      throw error;
    }
  }

  return { sync, push, pull };
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function pushQueueItem(item: SQLiteSyncQueueRow, householdId: string): Promise<void> {
  const client = requireSupabase();
  const table = item.table_name as TableName;
  const payload = JSON.parse(item.payload) as Record<string, unknown>;

  try {
    if (item.operation === 'DELETE') {
      const { error } = await client.from(table).delete().eq('id', item.record_id);
      throwIfError(error);
      await removeSyncQueueItem(item.id);
      return;
    }

    const serverPayload = toServerPayload(table, payload, householdId);

    if (item.operation === 'UPDATE') {
      const { data: serverRow, error } = await client
        .from(table)
        .select('*')
        .eq('id', item.record_id)
        .maybeSingle();
      throwIfError(error);

      const server = serverRow as Record<string, unknown> | null;
      if (server && String(server.updated_at) > String(serverPayload.updated_at)) {
        await withTransaction((db) => upsertLocalRow(db, table, server));
        await removeSyncQueueItem(item.id);
        return;
      }
    }

    const { error } = await client.from(table).upsert(serverPayload, { onConflict: 'id' });
    throwIfError(error);
    await removeSyncQueueItem(item.id);
    await markLocalSynced(table, item.record_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await incrementSyncQueueRetry(item.id, message);
  }
}

async function markLocalSynced(tableName: TableName, recordId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE ${tableName} SET sync_status = ? WHERE id = ?`, ['synced', recordId]);
}

async function fetchAllRows(tableName: TableName): Promise<Record<string, unknown>[] | null> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await requireSupabase()
      .from(tableName)
      .select('*')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) {
      console.warn(`Pull failed for ${tableName}:`, error?.message);
      return null;
    }
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

/** Returns the ids present on the server, or null when the table could not be read. */
async function pullTable(tableName: TableName): Promise<Set<string> | null> {
  const rows = await fetchAllRows(tableName);
  if (!rows) return null;

  await withTransaction(async (db) => {
    for (const serverRow of rows) {
      const localRow = await db.getFirstAsync<LocalRowState>(
        `SELECT id, sync_status, updated_at FROM ${tableName} WHERE id = ?`,
        [serverRow.id as string]
      );
      if (shouldApplyServerRow(localRow, String(serverRow.updated_at))) {
        await upsertLocalRow(db, tableName, serverRow);
      }
    }
  });

  return new Set(rows.map((row) => String(row.id)));
}

async function purgeDeletedRows(tableName: TableName, serverIds: Set<string>): Promise<void> {
  const db = await getDatabase();
  const localRows = await db.getAllAsync<LocalRowState>(
    `SELECT id, sync_status, updated_at FROM ${tableName}`
  );
  for (const id of staleLocalIds(localRows, serverIds)) {
    try {
      await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
    } catch (error) {
      // A pending local row still points here; keep it until that row syncs.
      console.warn(`Kept ${tableName} ${id}:`, error instanceof Error ? error.message : error);
    }
  }
}

async function upsertLocalRow(
  db: SQLiteDatabase,
  tableName: TableName,
  serverRow: Record<string, unknown>
): Promise<void> {
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
  const columns = info.map((col) => col.name).filter((col) => col !== 'sync_status');

  const existing = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT id FROM ${tableName} WHERE id = ?`,
    [serverRow.id as string]
  );

  const row = { ...serverRow };

  if (tableName === 'recipes' && Array.isArray(row.steps)) {
    row.steps = JSON.stringify(row.steps);
  }
  if (tableName === 'recipes' && Array.isArray(row.meal_types)) {
    row.meal_types = JSON.stringify(row.meal_types);
  }
  if (tableName === 'shopping_items' && Array.isArray(row.source_meal_ids)) {
    row.source_meal_ids = JSON.stringify(row.source_meal_ids);
  }

  const values = (cols: string[]): (string | number | null)[] =>
    cols.map((col) => {
      const value = row[col];
      if (value === null || value === undefined) return null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value as string | number;
    });

  if (existing) {
    const updateColumns = columns.filter((col) => col !== 'id');
    const setClause = updateColumns.map((col) => `${col} = ?`).join(', ');
    await db.runAsync(
      `UPDATE ${tableName} SET ${setClause}, sync_status = 'synced' WHERE id = ?`,
      [...values(updateColumns), row.id as string] as (string | number | null)[]
    );
  } else {
    const allColumns = [...columns, 'sync_status'];
    const cols = allColumns.join(', ');
    const placeholders = allColumns.map(() => '?').join(', ');
    await db.runAsync(
      `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})`,
      [...values(columns), 'synced'] as (string | number | null)[]
    );
  }
}

export const syncEngine = createSyncEngine();
