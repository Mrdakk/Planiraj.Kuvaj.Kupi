import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

function invalidateAll(queryClient: QueryClient, keys: QueryKey[]): Promise<void> {
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))).then(
    () => undefined
  );
}

/** Meals, plans (all weeks), pantry after cooking, missing and history. */
export function invalidateAfterMealChange(queryClient: QueryClient, mealId?: string) {
  return invalidateAll(queryClient, [
    ...(mealId ? [queryKeys.meal(mealId)] : []),
    queryKeys.mealPlans,
    queryKeys.pantryItems,
    queryKeys.missing,
    queryKeys.history,
  ]);
}

/** Recipe lists and details, their ingredients, and everything derived from planned recipes. */
export function invalidateAfterRecipeChange(queryClient: QueryClient) {
  return invalidateAll(queryClient, [
    queryKeys.recipes,
    queryKeys.recipeIngredientsAll,
    queryKeys.ingredients,
    queryKeys.mealPlans,
    queryKeys.missing,
    queryKeys.history,
  ]);
}

/** Pantry rows and anything that compares against stock. */
export function invalidateAfterPantryChange(queryClient: QueryClient) {
  return invalidateAll(queryClient, [
    queryKeys.pantryItems,
    queryKeys.ingredients,
    queryKeys.recipes,
    queryKeys.missing,
    queryKeys.shoppingLists,
  ]);
}

/** Shopping lists and items; purchases also touch pantry. */
export function invalidateAfterShoppingChange(queryClient: QueryClient) {
  return invalidateAll(queryClient, [
    queryKeys.shoppingLists,
    ['shoppingItems'],
    queryKeys.pantryItems,
    queryKeys.ingredients,
    queryKeys.missing,
  ]);
}
