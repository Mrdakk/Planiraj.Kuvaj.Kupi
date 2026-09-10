import { BaseRepository } from '@/database/repository';
import type { SQLiteMealRow, SyncStatus } from '@/database/types';
import type { Meal } from '@/types';

const columns = [
  'id',
  'meal_plan_id',
  'date',
  'meal_type',
  'recipe_id',
  'servings',
  'notes',
  'is_cooked',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): Meal {
    return {
      id: String(row.id),
      mealPlanId: String(row.meal_plan_id),
      date: String(row.date),
      mealType: String(row.meal_type) as Meal['mealType'],
      recipeId: String(row.recipe_id),
      servings: Number(row.servings),
      notes: row.notes ? String(row.notes) : null,
      isCooked: Number(row.is_cooked) === 1 || row.is_cooked === true,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: Meal): Record<string, unknown> {
    return {
      id: entity.id,
      meal_plan_id: entity.mealPlanId,
      date: entity.date,
      meal_type: entity.mealType,
      recipe_id: entity.recipeId,
      servings: entity.servings,
      notes: entity.notes,
      is_cooked: entity.isCooked ? 1 : 0,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const mealRepository = new BaseRepository<Meal>({
  tableName: 'meals',
  columns,
  mapper,
});

export function mealFromRow(row: SQLiteMealRow): Meal {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function mealToRow(entity: Meal): SQLiteMealRow {
  return mapper.toRow(entity) as unknown as SQLiteMealRow;
}
