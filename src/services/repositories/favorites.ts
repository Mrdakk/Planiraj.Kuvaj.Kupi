import { BaseRepository } from '@/database/repository';
import type { SQLiteFavoriteRow, SyncStatus } from '@/database/types';
import type { Favorite } from '@/types';

const columns = [
  'id',
  'recipe_id',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): Favorite {
    return {
      id: String(row.id),
      recipeId: String(row.recipe_id),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: Favorite): Record<string, unknown> {
    return {
      id: entity.id,
      recipe_id: entity.recipeId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const favoriteRepository = new BaseRepository<Favorite>({
  tableName: 'favorites',
  columns,
  mapper,
});

export function favoriteFromRow(row: SQLiteFavoriteRow): Favorite {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function favoriteToRow(entity: Favorite): SQLiteFavoriteRow {
  return mapper.toRow(entity) as unknown as SQLiteFavoriteRow;
}
