import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockDb = {
  execAsync: jest.fn(async () => undefined),
  runAsync: jest.fn(async () => undefined),
  getAllAsync: jest.fn(async () => []),
  closeAsync: jest.fn(async () => undefined),
  getFirstAsync: jest.fn(async (sql: string) => {
    if (String(sql).includes('migrations')) return { version: 100 };
    if (String(sql).includes('recipes')) return { name: 'recipes' };
    return null;
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => mockDb),
}));

import { closeDatabase, getDatabase } from '../index';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

describe('getDatabase', () => {
  beforeEach(async () => {
    await closeDatabase();
  });

  it('opens the database without seeding recipes', async () => {
    const db = await withTimeout(getDatabase(), 1000);
    expect(db).toBe(mockDb);
  });

  it('resolves concurrent getDatabase callers with the same connection', async () => {
    const [first, second] = await withTimeout(
      Promise.all([getDatabase(), getDatabase()]),
      1000
    );
    expect(first).toBe(mockDb);
    expect(second).toBe(mockDb);
  });
});
