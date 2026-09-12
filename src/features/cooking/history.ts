import type { Meal, Recipe } from '@/types';

export interface CookedMealHistoryItem {
  id: string;
  recipeName: string;
  date: string;
}

export function buildCookedMealHistory(
  meals: Meal[],
  recipes: Recipe[]
): CookedMealHistoryItem[] {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  return meals
    .filter((item) => item.isCooked)
    .map((item) => {
      const recipe = recipeById.get(item.recipeId);
      return {
        id: item.id,
        recipeName: recipe?.name?.trim() || 'Obrok',
        date: item.date,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.recipeName.localeCompare(b.recipeName));
}
