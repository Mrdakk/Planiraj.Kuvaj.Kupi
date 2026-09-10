import { BaseRepository } from '@/database/repository';
import type { SQLiteIngredientAliasRow, SyncStatus } from '@/database/types';
import type { IngredientAlias } from '@/types';

const columns = [
  'id',
  'ingredient_id',
  'alias',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): IngredientAlias {
    return {
      id: String(row.id),
      ingredientId: String(row.ingredient_id),
      alias: String(row.alias),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: IngredientAlias): Record<string, unknown> {
    return {
      id: entity.id,
      ingredient_id: entity.ingredientId,
      alias: entity.alias,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const ingredientAliasRepository = new BaseRepository<IngredientAlias>({
  tableName: 'ingredient_aliases',
  columns,
  mapper,
});

export function ingredientAliasFromRow(row: SQLiteIngredientAliasRow): IngredientAlias {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function ingredientAliasToRow(entity: IngredientAlias): SQLiteIngredientAliasRow {
  return mapper.toRow(entity) as unknown as SQLiteIngredientAliasRow;
}
