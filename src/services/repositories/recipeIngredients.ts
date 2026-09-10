import { BaseRepository } from '@/database/repository';
import type { SQLiteRecipeIngredientRow, SyncStatus } from '@/database/types';
import type { RecipeIngredient } from '@/types';

const columns = [
  'id',
  'recipe_id',
  'ingredient_id',
  'quantity',
  'unit',
  'notes',
  'sort_order',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): RecipeIngredient {
    return {
      id: String(row.id),
      recipeId: String(row.recipe_id),
      ingredientId: String(row.ingredient_id),
      quantity: Number(row.quantity),
      unit: String(row.unit) as RecipeIngredient['unit'],
      notes: row.notes ? String(row.notes) : null,
      sortOrder: Number(row.sort_order),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: RecipeIngredient): Record<string, unknown> {
    return {
      id: entity.id,
      recipe_id: entity.recipeId,
      ingredient_id: entity.ingredientId,
      quantity: entity.quantity,
      unit: entity.unit,
      notes: entity.notes,
      sort_order: entity.sortOrder,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const recipeIngredientRepository = new BaseRepository<RecipeIngredient>({
  tableName: 'recipe_ingredients',
  columns,
  mapper,
});

export function recipeIngredientFromRow(row: SQLiteRecipeIngredientRow): RecipeIngredient {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function recipeIngredientToRow(entity: RecipeIngredient): SQLiteRecipeIngredientRow {
  return mapper.toRow(entity) as unknown as SQLiteRecipeIngredientRow;
}
