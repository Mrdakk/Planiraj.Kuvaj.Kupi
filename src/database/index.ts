import * as SQLite from 'expo-sqlite';
import { schemaMigrations, schemaV1 } from './schema';

export const LOCAL_DB_NAME = 'pkk.db';

type DbGlobal = typeof globalThis & {
  __pkkSqlite?: SQLite.SQLiteDatabase;
  __pkkSqliteInit?: Promise<SQLite.SQLiteDatabase>;
};

const dbGlobal = globalThis as DbGlobal;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbGlobal.__pkkSqlite) return dbGlobal.__pkkSqlite;
  if (!dbGlobal.__pkkSqliteInit) {
    dbGlobal.__pkkSqliteInit = initializeDatabase().catch((error: unknown) => {
      dbGlobal.__pkkSqliteInit = undefined;
      throw error;
    });
  }
  return dbGlobal.__pkkSqliteInit;
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(LOCAL_DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA busy_timeout = 5000');
  await db.execAsync('PRAGMA foreign_keys = ON');
  await migrateDatabase(db);
  await ensureCoreTables(db);

  dbGlobal.__pkkSqlite = db;
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (dbGlobal.__pkkSqlite) {
    await dbGlobal.__pkkSqlite.closeAsync();
    dbGlobal.__pkkSqlite = undefined;
  }
  dbGlobal.__pkkSqliteInit = undefined;
}

async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersion = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM migrations ORDER BY version DESC LIMIT 1'
  );

  const startVersion = currentVersion?.version ?? 0;
  const targetVersion = Math.max(...Object.keys(schemaMigrations).map(Number));

  for (let version = startVersion + 1; version <= targetVersion; version++) {
    const sql = schemaMigrations[version];
    if (!sql) continue;

    await execMigration(db, sql);
    await db.runAsync(
      'INSERT INTO migrations (version, applied_at) VALUES (?, ?)',
      [version, new Date().toISOString()]
    );
  }
}

/**
 * Runs one statement at a time so a re-run (lost migrations row) skips columns
 * that already exist instead of aborting. The schema has no triggers, so `;`
 * only ends statements.
 */
export async function execMigration(db: SQLite.SQLiteDatabase, sql: string): Promise<void> {
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement && !/^(--[^\n]*\n?)+$/.test(statement));
  for (const statement of statements) {
    try {
      await db.execAsync(`${statement};`);
    } catch (error) {
      if (/duplicate column name/i.test(String(error))) continue;
      throw error;
    }
  }
}

async function ensureCoreTables(db: SQLite.SQLiteDatabase): Promise<void> {
  const recipesTable = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recipes'"
  );
  if (recipesTable) return;

  await db.execAsync(schemaV1);
  await db.runAsync(
    'INSERT OR IGNORE INTO migrations (version, applied_at) VALUES (?, ?)',
    [1, new Date().toISOString()]
  );
}
