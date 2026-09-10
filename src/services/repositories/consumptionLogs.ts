import { BaseRepository } from '@/database/repository';
import type { SQLiteConsumptionLogRow, SyncStatus } from '@/database/types';
import type { ConsumptionLog } from '@/types';

const columns = [
  'id',
  'meal_id',
  'ingredient_id',
  'quantity',
  'unit',
  'consumed_at',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): ConsumptionLog {
    return {
      id: String(row.id),
      mealId: String(row.meal_id),
      ingredientId: String(row.ingredient_id),
      quantity: Number(row.quantity),
      unit: String(row.unit) as ConsumptionLog['unit'],
      consumedAt: String(row.consumed_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: ConsumptionLog): Record<string, unknown> {
    return {
      id: entity.id,
      meal_id: entity.mealId,
      ingredient_id: entity.ingredientId,
      quantity: entity.quantity,
      unit: entity.unit,
      consumed_at: entity.consumedAt,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const consumptionLogRepository = new BaseRepository<ConsumptionLog>({
  tableName: 'consumption_logs',
  columns,
  mapper,
});

export function consumptionLogFromRow(row: SQLiteConsumptionLogRow): ConsumptionLog {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function consumptionLogToRow(entity: ConsumptionLog): SQLiteConsumptionLogRow {
  return mapper.toRow(entity) as unknown as SQLiteConsumptionLogRow;
}
