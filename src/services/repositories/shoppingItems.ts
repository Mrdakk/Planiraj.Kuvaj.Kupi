import { BaseRepository } from '@/database/repository';
import type { SQLiteShoppingItemRow, SyncStatus } from '@/database/types';
import type { ShoppingItem } from '@/types';

const columns = [
  'id',
  'shopping_list_id',
  'ingredient_id',
  'name',
  'quantity',
  'unit',
  'category',
  'is_checked',
  'is_manual',
  'source_meal_ids',
  'notes',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): ShoppingItem {
    return {
      id: String(row.id),
      shoppingListId: String(row.shopping_list_id),
      ingredientId: row.ingredient_id ? String(row.ingredient_id) : null,
      name: String(row.name),
      quantity: Number(row.quantity),
      unit: String(row.unit) as ShoppingItem['unit'],
      category: String(row.category) as ShoppingItem['category'],
      isChecked: Boolean(row.is_checked),
      isManual: Boolean(row.is_manual),
      sourceMealIds: JSON.parse(String(row.source_meal_ids ?? '[]')),
      notes: row.notes ? String(row.notes) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: ShoppingItem): Record<string, unknown> {
    return {
      id: entity.id,
      shopping_list_id: entity.shoppingListId,
      ingredient_id: entity.ingredientId,
      name: entity.name,
      quantity: entity.quantity,
      unit: entity.unit,
      category: entity.category,
      is_checked: entity.isChecked ? 1 : 0,
      is_manual: entity.isManual ? 1 : 0,
      source_meal_ids: JSON.stringify(entity.sourceMealIds),
      notes: entity.notes,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const shoppingItemRepository = new BaseRepository<ShoppingItem>({
  tableName: 'shopping_items',
  columns,
  mapper,
});

export function shoppingItemFromRow(row: SQLiteShoppingItemRow): ShoppingItem {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function shoppingItemToRow(entity: ShoppingItem): SQLiteShoppingItemRow {
  return mapper.toRow(entity) as unknown as SQLiteShoppingItemRow;
}
