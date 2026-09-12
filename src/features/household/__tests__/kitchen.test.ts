import { describe, expect, it } from '@jest/globals';
import { KITCHEN_WIPE_ORDER } from '../kitchen';

describe('KITCHEN_WIPE_ORDER', () => {
  it('deletes child tables before parents so foreign keys stay valid', () => {
    expect(KITCHEN_WIPE_ORDER).toEqual([
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
    ]);
  });
});
