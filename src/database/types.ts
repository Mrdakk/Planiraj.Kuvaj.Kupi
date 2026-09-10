import type { SQLiteDatabase, SQLiteRunResult } from 'expo-sqlite';

export type { SQLiteDatabase, SQLiteRunResult };

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export interface SyncableRow {
  id: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface SQLiteIngredientRow extends SyncableRow {
  name: string;
  category: string;
  default_unit: string;
  emoji: string | null;
  track_presence: number;
}

export interface SQLiteIngredientAliasRow extends SyncableRow {
  ingredient_id: string;
  alias: string;
}

export interface SQLiteRecipeRow extends SyncableRow {
  name: string;
  description: string | null;
  image_uri: string | null;
  base_servings: number;
  prep_time_minutes: number | null;
  category: string | null;
  is_favorite: number;
  steps: string;
  notes: string | null;
  emoji: string | null;
}

export interface SQLiteRecipeIngredientRow extends SyncableRow {
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  notes: string | null;
  sort_order: number;
}

export interface SQLiteMealPlanRow extends SyncableRow {
  week_start: string;
}

export interface SQLiteMealRow extends SyncableRow {
  meal_plan_id: string;
  date: string;
  meal_type: string;
  recipe_id: string;
  servings: number;
  notes: string | null;
  is_cooked: number;
}

export interface SQLitePantryItemRow extends SyncableRow {
  ingredient_id: string;
  quantity: number;
  unit: string;
  expires_at: string | null;
  notes: string | null;
}

export interface SQLiteShoppingListRow extends SyncableRow {
  week_start: string | null;
  name: string | null;
}

export interface SQLiteShoppingItemRow extends SyncableRow {
  shopping_list_id: string;
  ingredient_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  is_checked: number;
  is_manual: number;
  source_meal_ids: string;
  notes: string | null;
}

export interface SQLiteConsumptionLogRow extends SyncableRow {
  meal_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  consumed_at: string;
}

export interface SQLiteFavoriteRow extends SyncableRow {
  recipe_id: string;
}

export interface SQLiteSyncQueueRow {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  payload: string;
  created_at: string;
  retry_count: number;
  last_error: string | null;
}

export interface SQLiteSyncStateRow {
  id: string;
  last_synced_at: string | null;
  status: 'idle' | 'syncing' | 'error' | 'offline';
  pending_count: number;
}

export type SQLiteRow =
  | SQLiteIngredientRow
  | SQLiteIngredientAliasRow
  | SQLiteRecipeRow
  | SQLiteRecipeIngredientRow
  | SQLiteMealPlanRow
  | SQLiteMealRow
  | SQLitePantryItemRow
  | SQLiteShoppingListRow
  | SQLiteShoppingItemRow
  | SQLiteConsumptionLogRow
  | SQLiteFavoriteRow;
