export const KITCHEN_WIPE_ORDER = [
  'consumption_logs',
  'shopping_items',
  'shopping_lists',
  'meals',
  'meal_plans',
  'favorites',
  'recipe_ingredients',
  'recipes',
  'pantry_items',
  'ingredient_aliases',
  'ingredients',
] as const;

export const KITCHEN_PUSH_ORDER = [...KITCHEN_WIPE_ORDER].reverse();

export type KitchenTableName = (typeof KITCHEN_WIPE_ORDER)[number];
