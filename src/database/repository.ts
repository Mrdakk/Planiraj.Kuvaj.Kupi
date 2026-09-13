import { getDatabase } from './index';
import type { SQLiteDatabase, SyncStatus, SQLiteSyncQueueRow, SQLiteSyncStateRow } from './types';
import { notifySyncQueued } from '@/sync/queueEvents';

export { getDatabase };
export type { SQLiteDatabase };

export type TableName =
  | 'ingredients'
  | 'ingredient_aliases'
  | 'recipes'
  | 'recipe_ingredients'
  | 'meal_plans'
  | 'meals'
  | 'pantry_items'
  | 'shopping_lists'
  | 'shopping_items'
  | 'consumption_logs'
  | 'favorites';

export interface RowMapper<T> {
  fromRow(row: Record<string, unknown>): T;
  toRow(entity: T): Record<string, unknown>;
}

export interface RepositoryOptions<T> {
  tableName: TableName;
  columns: string[];
  mapper: RowMapper<T>;
}

export class BaseRepository<T extends { id: string; updatedAt: string }> {
  private readonly tableName: TableName;
  private readonly columns: string[];
  private readonly mapper: RowMapper<T>;

  constructor(options: RepositoryOptions<T>) {
    this.tableName = options.tableName;
    this.columns = options.columns;
    this.mapper = options.mapper;
  }

  async findAll(orderBy?: string): Promise<T[]> {
    const db = await getDatabase();
    const sql = orderBy
      ? `SELECT * FROM ${this.tableName} ORDER BY ${orderBy}`
      : `SELECT * FROM ${this.tableName}`;
    const rows = await db.getAllAsync<Record<string, unknown>>(sql);
    return rows.map((row) => this.mapper.fromRow(row));
  }

  async findById(id: string): Promise<T | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapper.fromRow(row) : null;
  }

  async findManyWhere(whereClause: string, params: (string | number | null)[]): Promise<T[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
      params
    );
    return rows.map((row) => this.mapper.fromRow(row));
  }

  async insert(entity: T): Promise<T> {
    const db = await getDatabase();
    if (!entity.id) {
      entity = { ...entity, id: generateUUID() };
    }
    const row = this.mapper.toRow(entity);
    const cols = this.columns.join(', ');
    const placeholders = this.columns.map(() => '?').join(', ');
    const values = this.columns.map((col) => row[col] ?? null);

    await db.runAsync(
      `INSERT INTO ${this.tableName} (${cols}) VALUES (${placeholders})`,
      values as (string | number | null)[]
    );

    await this.enqueueSync('INSERT', entity);
    return entity;
  }

  async update(entity: T): Promise<T> {
    const db = await getDatabase();
    const row = this.mapper.toRow(entity);
    const setClause = this.columns
      .filter((col) => col !== 'id')
      .map((col) => `${col} = ?`)
      .join(', ');
    const values = this.columns
      .filter((col) => col !== 'id')
      .map((col) => row[col] ?? null);

    await db.runAsync(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
      [...values, entity.id] as (string | number | null)[]
    );

    await this.enqueueSync('UPDATE', entity);
    return entity;
  }

  async upsert(entity: T): Promise<T> {
    const existing = await this.findById(entity.id);
    if (existing) {
      return this.update(entity);
    }
    return this.insert(entity);
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    await this.enqueueSync('DELETE', { id, updatedAt: nowISO() } as T);
  }

  async markSynced(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE ${this.tableName} SET sync_status = 'synced' WHERE id = ?`,
      [id]
    );
  }

  async markAllPending(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE ${this.tableName} SET sync_status = 'pending' WHERE sync_status != 'synced'`
    );
  }

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM ${this.tableName}`);
  }

  async count(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    return row?.count ?? 0;
  }

  private async enqueueSync(operation: 'INSERT' | 'UPDATE' | 'DELETE', entity: T): Promise<void> {
    const db = await getDatabase();
    const queueId = generateUUID();
    const payload = operation === 'DELETE' ? { id: entity.id } : entity;

    await db.runAsync(
      `INSERT INTO sync_queue (id, table_name, operation, record_id, payload, created_at, retry_count, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        queueId,
        this.tableName,
        operation,
        entity.id,
        JSON.stringify(payload),
        new Date().toISOString(),
        0,
        null,
      ] as (string | number | null)[]
    );
    notifySyncQueued();
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

export async function getSyncQueue(): Promise<SQLiteSyncQueueRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteSyncQueueRow>(
    'SELECT * FROM sync_queue ORDER BY created_at ASC'
  );
}

export async function getPendingSyncQueue(): Promise<SQLiteSyncQueueRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<SQLiteSyncQueueRow>(
    'SELECT * FROM sync_queue WHERE retry_count < 10 ORDER BY created_at ASC'
  );
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export async function incrementSyncQueueRetry(
  id: string,
  error: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?',
    [error, id]
  );
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM sync_queue');
}

export async function updateSyncState(
  updates: Partial<Omit<SQLiteSyncStateRow, 'id'>>
): Promise<void> {
  const db = await getDatabase();
  const keys = Object.keys(updates);
  if (keys.length === 0) return;

  const setClause = keys.map((key) => `${key} = ?`).join(', ');
  const values = Object.values(updates);

  await db.runAsync(
    `UPDATE sync_state SET ${setClause} WHERE id = 'global'`,
    values as (string | number | null)[]
  );
}

export async function getSyncState(): Promise<SQLiteSyncStateRow | null> {
  const db = await getDatabase();
  return db.getFirstAsync<SQLiteSyncStateRow>(
    "SELECT * FROM sync_state WHERE id = 'global'"
  );
}

export async function withTransaction<T>(
  fn: (db: SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  let result: T | undefined;
  await db.withTransactionAsync(async () => {
    result = await fn(db);
  });
  return result as T;
}

export function syncStatusFromText(value: string): SyncStatus {
  if (value === 'syncing' || value === 'synced' || value === 'error') {
    return value;
  }
  return 'pending';
}

export function syncStatusToText(status: SyncStatus): string {
  return status;
}
