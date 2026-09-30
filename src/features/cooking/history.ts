import { mealTypes, type MealType } from '@/constants/categories';
import type { Meal, Recipe } from '@/types';

export interface CookedMealHistoryItem {
  id: string;
  recipeName: string;
  date: string;
  mealType: MealType;
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
        mealType: item.mealType,
      };
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        mealTypes.indexOf(a.mealType) - mealTypes.indexOf(b.mealType) ||
        a.recipeName.localeCompare(b.recipeName)
    );
}
