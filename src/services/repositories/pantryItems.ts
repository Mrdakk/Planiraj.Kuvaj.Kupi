import { BaseRepository } from '@/database/repository';
import type { SQLitePantryItemRow, SyncStatus } from '@/database/types';
import type { PantryItem } from '@/types';

const columns = [
  'id',
  'ingredient_id',
  'quantity',
  'unit',
  'expires_at',
  'notes',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): PantryItem {
    return {
      id: String(row.id),
      ingredientId: String(row.ingredient_id),
      quantity: Number(row.quantity),
      unit: String(row.unit) as PantryItem['unit'],
      expiresAt: row.expires_at ? String(row.expires_at) : null,
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: PantryItem): Record<string, unknown> {
    return {
      id: entity.id,
      ingredient_id: entity.ingredientId,
      quantity: entity.quantity,
      unit: entity.unit,
      expires_at: entity.expiresAt,
      notes: entity.notes,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const pantryItemRepository = new BaseRepository<PantryItem>({
  tableName: 'pantry_items',
  columns,
  mapper,
});

export function pantryItemFromRow(row: SQLitePantryItemRow): PantryItem {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function pantryItemToRow(entity: PantryItem): SQLitePantryItemRow {
  return mapper.toRow(entity) as unknown as SQLitePantryItemRow;
}
