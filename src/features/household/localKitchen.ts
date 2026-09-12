import { clearSyncQueue, getDatabase, nowISO } from '@/database/repository';
import { generateUUID } from '@/lib/uuid';
import { KITCHEN_PUSH_ORDER, KITCHEN_WIPE_ORDER } from './kitchen';

export async function replaceLocalKitchen(): Promise<void> {
  const db = await getDatabase();
  for (const table of KITCHEN_WIPE_ORDER) {
    await db.runAsync(`DELETE FROM ${table}`);
  }
  await clearSyncQueue();
}

export async function enqueueLocalKitchenForPush(): Promise<void> {
  const db = await getDatabase();
  await clearSyncQueue();

  for (const table of KITCHEN_PUSH_ORDER) {
    await db.runAsync(`UPDATE ${table} SET sync_status = 'pending'`);
    const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
    for (const row of rows) {
      await db.runAsync(
        `INSERT INTO sync_queue (
          id, table_name, operation, record_id, payload, created_at, retry_count, last_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateUUID(),
          table,
          'INSERT',
          String(row.id),
          JSON.stringify(row),
          nowISO(),
          0,
          null,
        ]
      );
    }
  }
}
