import { getDatabase, nowISO } from '@/database/repository';
import type { SQLiteHouseholdStateRow } from '@/database/types';
import type { HouseholdState } from '@/types';

const CURRENT_ID = 'current';

function fromRow(row: SQLiteHouseholdStateRow): HouseholdState {
  return {
    householdId: row.household_id,
    memberId: row.member_id,
    displayName: row.display_name,
    joinToken: row.join_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getHouseholdState(): Promise<HouseholdState | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SQLiteHouseholdStateRow>(
    'SELECT * FROM household_state WHERE id = ?',
    [CURRENT_ID]
  );
  return row ? fromRow(row) : null;
}

export async function saveHouseholdState(
  state: Omit<HouseholdState, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
  }
): Promise<HouseholdState> {
  const db = await getDatabase();
  const existing = await getHouseholdState();
  const now = nowISO();
  const createdAt = existing?.createdAt ?? state.createdAt ?? now;
  const next: HouseholdState = {
    householdId: state.householdId,
    memberId: state.memberId,
    displayName: state.displayName,
    joinToken: state.joinToken,
    createdAt,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO household_state (
      id, household_id, member_id, display_name, join_token, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      household_id = excluded.household_id,
      member_id = excluded.member_id,
      display_name = excluded.display_name,
      join_token = excluded.join_token,
      updated_at = excluded.updated_at`,
    [
      CURRENT_ID,
      next.householdId,
      next.memberId,
      next.displayName,
      next.joinToken,
      next.createdAt,
      next.updatedAt,
    ]
  );

  return next;
}
