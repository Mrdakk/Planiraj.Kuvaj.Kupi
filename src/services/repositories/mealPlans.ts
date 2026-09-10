import { BaseRepository } from '@/database/repository';
import type { SQLiteMealPlanRow, SyncStatus } from '@/database/types';
import type { MealPlan } from '@/types';

const columns = [
  'id',
  'week_start',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): MealPlan {
    return {
      id: String(row.id),
      weekStart: String(row.week_start),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: MealPlan): Record<string, unknown> {
    return {
      id: entity.id,
      week_start: entity.weekStart,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const mealPlanRepository = new BaseRepository<MealPlan>({
  tableName: 'meal_plans',
  columns,
  mapper,
});

export function mealPlanFromRow(row: SQLiteMealPlanRow): MealPlan {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function mealPlanToRow(entity: MealPlan): SQLiteMealPlanRow {
  return mapper.toRow(entity) as unknown as SQLiteMealPlanRow;
}
