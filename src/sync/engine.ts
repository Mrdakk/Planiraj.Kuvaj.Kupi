import { supabase } from '@/lib/supabase';
import {
  getPendingSyncQueue,
  removeSyncQueueItem,
  incrementSyncQueueRetry,
  updateSyncState,
  withTransaction,
  getDatabase,
  nowISO,
} from '@/database/repository';
import type { SQLiteDatabase, SQLiteSyncQueueRow, SyncStatus } from '@/database/types';
import type { TableName } from '@/database/repository';
import { useAppStore } from '@/store/appStore';

export interface SyncEngine {
  sync(): Promise<void>;
  push(): Promise<void>;
  pull(): Promise<void>;
}

export function createSyncEngine(): SyncEngine {
  async function push(): Promise<void> {
    const queue = await getPendingSyncQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      await pushQueueItem(item);
    }
  }

  async function pull(): Promise<void> {
    await pullTable('ingredients');
    await pullTable('ingredient_aliases');
    await pullTable('recipes');
    await pullTable('recipe_ingredients');
    await pullTable('meal_plans');
    await pullTable('meals');
    await pullTable('pantry_items');
    await pullTable('shopping_lists');
    await pullTable('shopping_items');
    await pullTable('consumption_logs');
    await pullTable('favorites');
  }

  async function sync(): Promise<void> {
    await updateSyncState({ status: 'syncing' });
    useAppStore.getState().setSyncStatus('syncing');

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        await updateSyncState({ status: 'idle' });
        useAppStore.getState().setSyncStatus('offline');
        return;
      }

      await pull();
      await push();

      await updateSyncState({ status: 'idle', last_synced_at: nowISO() });
      useAppStore.getState().setSyncStatus('synced');
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

async function pushQueueItem(item: SQLiteSyncQueueRow): Promise<void> {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;

  try {
    if (item.operation === 'DELETE') {
      await supabase.from(item.table_name).delete().eq('id', item.record_id);
    } else if (item.operation === 'INSERT') {
      const serverPayload = toServerPayload(item.table_name as TableName, payload);
      await supabase.from(item.table_name).upsert(serverPayload, { onConflict: 'id' });
    } else {
      const { data: serverRow } = await supabase
        .from(item.table_name)
        .select('*')
        .eq('id', item.record_id)
        .single();

      const serverPayload = toServerPayload(item.table_name as TableName, payload);

      if (serverRow) {
        const conflict = resolveConflictForQueue(item, serverPayload, serverRow as Record<string, unknown>);
        if (conflict.resolution === 'server_wins') {
          await removeSyncQueueItem(item.id);
          await markLocalSynced(item.table_name as TableName, item.record_id);
          return;
        }
        await supabase.from(item.table_name).upsert(conflict.payload, { onConflict: 'id' });
      } else {
        await supabase.from(item.table_name).upsert(serverPayload, { onConflict: 'id' });
      }
    }

    await removeSyncQueueItem(item.id);
    await markLocalSynced(item.table_name as TableName, item.record_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await incrementSyncQueueRetry(item.id, message);
  }
}

function toServerPayload(tableName: TableName, payload: Record<string, unknown>): Record<string, unknown> {
  const { sync_status, ...serverPayload } = payload;
  void sync_status;

  if (tableName === 'recipes' && typeof serverPayload.steps === 'string') {
    serverPayload.steps = JSON.parse(serverPayload.steps);
  }
  if (tableName === 'shopping_items' && typeof serverPayload.source_meal_ids === 'string') {
    serverPayload.source_meal_ids = JSON.parse(serverPayload.source_meal_ids);
  }

  return serverPayload;
}

interface ConflictResult {
  payload: Record<string, unknown>;
  resolution: 'server_wins' | 'local_wins' | 'delta_merged';
}

function resolveConflictForQueue(
  item: SQLiteSyncQueueRow,
  localPayload: Record<string, unknown>,
  serverRow: Record<string, unknown>
): ConflictResult {
  if (item.table_name !== 'pantry_items') {
    const localUpdatedAt = String(localPayload.updated_at);
    const serverUpdatedAt = String(serverRow.updated_at);
    if (serverUpdatedAt > localUpdatedAt) {
      return { payload: serverRow, resolution: 'server_wins' };
    }
    return { payload: localPayload, resolution: 'local_wins' };
  }

  const previousQuantity = Number(localPayload.previousQuantity ?? NaN);
  if (!Number.isNaN(previousQuantity) && localPayload.unit === serverRow.unit) {
    const localQuantity = Number(localPayload.quantity);
    const serverQuantity = Number(serverRow.quantity);
    const delta = localQuantity - previousQuantity;
    const mergedQuantity = Math.max(0, serverQuantity + delta);
    return {
      payload: { ...localPayload, quantity: mergedQuantity },
      resolution: 'delta_merged',
    };
  }

  const localUpdatedAt = String(localPayload.updated_at);
  const serverUpdatedAt = String(serverRow.updated_at);
  if (serverUpdatedAt > localUpdatedAt) {
    return { payload: serverRow, resolution: 'server_wins' };
  }
  return { payload: localPayload, resolution: 'local_wins' };
}

async function markLocalSynced(tableName: TableName, recordId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE ${tableName} SET sync_status = ? WHERE id = ?`,
    ['synced', recordId]
  );
}

async function pullTable(tableName: TableName): Promise<void> {
  const { data: rows, error } = await supabase.from(tableName).select('*');
  if (error || !rows) {
    console.warn(`Pull failed for ${tableName}:`, error?.message);
    return;
  }

  await withTransaction(async (db) => {
    for (const serverRow of rows as Record<string, unknown>[]) {
      const localRow = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [serverRow.id as string]
      );

      if (localRow) {
        const localSyncStatus = String(localRow.sync_status) as SyncStatus;
        const localUpdatedAt = String(localRow.updated_at);
        const serverUpdatedAt = String(serverRow.updated_at);

        if (localSyncStatus === 'pending' && serverUpdatedAt > localUpdatedAt) {
          if (tableName !== 'pantry_items') {
            await upsertLocalRow(db, tableName, serverRow);
          }
        } else if (serverUpdatedAt > localUpdatedAt) {
          await upsertLocalRow(db, tableName, serverRow);
        }
      } else {
        await upsertLocalRow(db, tableName, serverRow);
      }
    }
  });
}

async function upsertLocalRow(
  db: SQLiteDatabase,
  tableName: TableName,
  serverRow: Record<string, unknown>
): Promise<void> {
  const info = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName})`
  );
  const columns = info.map((col) => col.name).filter((col) => col !== 'sync_status');

  const existing = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT id FROM ${tableName} WHERE id = ?`,
    [serverRow.id as string]
  );

  const row = { ...serverRow };

  if (tableName === 'recipes' && Array.isArray(row.steps)) {
    row.steps = JSON.stringify(row.steps);
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
