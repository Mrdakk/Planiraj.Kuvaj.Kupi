import type { TableName } from '@/database/repository';
import type { PantryItem } from '@/types';

export interface ConflictContext<T> {
  tableName: TableName;
  localEntity: T;
  serverEntity: T;
  previousEntity?: T;
}

export interface ResolvedEntity<T> {
  entity: T;
  resolution: 'server_wins' | 'local_wins' | 'delta_merged';
}

export function resolveConflict<T extends { updatedAt: string }>(
  context: ConflictContext<T>
): ResolvedEntity<T> {
  const { tableName, localEntity, serverEntity, previousEntity } = context;

  // Pantry: apply delta to server quantity instead of blind overwrite.
  if (tableName === 'pantry_items' && previousEntity) {
    const local = localEntity as unknown as PantryItem;
    const server = serverEntity as unknown as PantryItem;
    const previous = previousEntity as unknown as PantryItem;

    if (local.unit === server.unit && previous.unit === server.unit) {
      const delta = local.quantity - previous.quantity;
      const mergedQuantity = Math.max(0, server.quantity + delta);
      const merged: PantryItem = {
        ...server,
        quantity: mergedQuantity,
        updatedAt: local.updatedAt,
      };
      return {
        entity: merged as unknown as T,
        resolution: 'delta_merged',
      };
    }
  }

  // Default: server wins (last write wins by timestamp).
  if (serverEntity.updatedAt > localEntity.updatedAt) {
    return { entity: serverEntity, resolution: 'server_wins' };
  }

  return { entity: localEntity, resolution: 'local_wins' };
}
