const BOOLEAN_COLUMNS = new Set([
  'is_favorite',
  'is_cooked',
  'is_checked',
  'is_manual',
  'track_presence',
]);

const JSON_COLUMNS: Record<string, string[]> = {
  recipes: ['steps', 'meal_types'],
  shopping_items: ['source_meal_ids'],
};

const KEY_ALIASES: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  defaultUnit: 'default_unit',
  trackPresence: 'track_presence',
  dishType: 'category',
  mealTypes: 'meal_types',
  imageUri: 'image_uri',
  baseServings: 'base_servings',
  prepTimeMinutes: 'prep_time_minutes',
  isFavorite: 'is_favorite',
  mealPlanId: 'meal_plan_id',
  mealType: 'meal_type',
  recipeId: 'recipe_id',
  isCooked: 'is_cooked',
  ingredientId: 'ingredient_id',
  expiresAt: 'expires_at',
  weekStart: 'week_start',
  shoppingListId: 'shopping_list_id',
  isChecked: 'is_checked',
  isManual: 'is_manual',
  sourceMealIds: 'source_meal_ids',
  sortOrder: 'sort_order',
  consumedAt: 'consumed_at',
};

const DROP_KEYS = new Set([
  'sync_status',
  'syncStatus',
  'emoji',
  'emojiSource',
  'emoji_source',
  'user_id',
  'userId',
  'previousQuantity',
]);

function toSnakeKey(key: string): string {
  if (KEY_ALIASES[key]) return KEY_ALIASES[key];
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function maybeParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function toServerPayload(
  tableName: string,
  payload: Record<string, unknown>,
  householdId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (DROP_KEYS.has(key)) continue;
    row[toSnakeKey(key)] = value;
  }

  for (const column of JSON_COLUMNS[tableName] ?? []) {
    if (column in row) {
      row[column] = maybeParseJson(row[column]);
    }
  }

  for (const column of BOOLEAN_COLUMNS) {
    if (column in row) {
      row[column] = asBoolean(row[column]);
    }
  }

  row.household_id = householdId;
  return row;
}
