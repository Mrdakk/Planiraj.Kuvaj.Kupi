import { BaseRepository } from '@/database/repository';
import type { SQLiteShoppingListRow, SyncStatus } from '@/database/types';
import type { ShoppingList } from '@/types';

const columns = [
  'id',
  'week_start',
  'name',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): ShoppingList {
    return {
      id: String(row.id),
      weekStart: row.week_start ? String(row.week_start) : null,
      name: row.name ? String(row.name) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: ShoppingList): Record<string, unknown> {
    return {
      id: entity.id,
      week_start: entity.weekStart,
      name: entity.name,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const shoppingListRepository = new BaseRepository<ShoppingList>({
  tableName: 'shopping_lists',
  columns,
  mapper,
});

export function shoppingListFromRow(row: SQLiteShoppingListRow): ShoppingList {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function shoppingListToRow(entity: ShoppingList): SQLiteShoppingListRow {
  return mapper.toRow(entity) as unknown as SQLiteShoppingListRow;
}
