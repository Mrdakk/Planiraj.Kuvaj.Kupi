import { BaseRepository } from '@/database/repository';
import type { SQLiteIngredientRow, SyncStatus } from '@/database/types';
import type { Ingredient } from '@/types';

const columns = [
  'id',
  'name',
  'category',
  'default_unit',
  'emoji',
  'track_presence',
  'created_at',
  'updated_at',
  'sync_status',
];

function readTrackPresence(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

const mapper = {
  fromRow(row: Record<string, unknown>): Ingredient {
    return {
      id: String(row.id),
      name: String(row.name),
      category: String(row.category) as Ingredient['category'],
      defaultUnit: String(row.default_unit) as Ingredient['defaultUnit'],
      emoji: row.emoji ? String(row.emoji) : null,
      trackPresence: readTrackPresence(row.track_presence),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: Ingredient): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      category: entity.category,
      default_unit: entity.defaultUnit,
      emoji: entity.emoji,
      track_presence: entity.trackPresence ? 1 : 0,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const ingredientRepository = new BaseRepository<Ingredient>({
  tableName: 'ingredients',
  columns,
  mapper,
});

export function ingredientFromRow(row: SQLiteIngredientRow): Ingredient {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function ingredientToRow(entity: Ingredient): SQLiteIngredientRow {
  return mapper.toRow(entity) as unknown as SQLiteIngredientRow;
}
