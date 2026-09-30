import type { Unit } from '@/constants/units';
import { mealTypes } from '@/constants/categories';
import type { CalculationResult } from '@/calculations/engine';
import type { Meal, Recipe } from '@/types';

const EPSILON = 1e-6;

export interface DayIngredientRow {
  /** Same as the calculation result key: ingredient plus unit family. */
  key: string;
  ingredientId: string;
  ingredientName: string;
  category: string;
  quantity: number;
  unit: Unit;
}

export interface DayRecipeGroup {
  recipeId: string;
  recipeName: string;
  mealCount: number;
  mealIds: string[];
  items: DayIngredientRow[];
}

export interface MissingDayGroup {
  date: string;
  recipes: DayRecipeGroup[];
}

function compareMealsChronologically(a: Meal, b: Meal): number {
  return (
    a.date.localeCompare(b.date) ||
    mealTypes.indexOf(a.mealType) - mealTypes.indexOf(b.mealType)
  );
}

/**
 * Splits each missing amount across the week's meals. Pantry stock covers the
 * earliest meals first, so the day totals add up to exactly what is missing.
 */
export function groupMissingByDay(
  missing: CalculationResult[],
  meals: Meal[],
  recipes: Recipe[]
): MissingDayGroup[] {
  const mealMap = new Map(meals.map((meal) => [meal.id, meal]));
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const days = new Map<
    string,
    Map<string, { recipeName: string; mealIds: Set<string>; items: Map<string, DayIngredientRow> }>
  >();

  for (const item of missing) {
    let covered = Math.max(0, item.requiredQuantity - item.missingQuantity);
    const breakdowns = item.meals
      .map((breakdown) => ({ breakdown, meal: mealMap.get(breakdown.mealId) }))
      .filter((entry): entry is { breakdown: typeof entry.breakdown; meal: Meal } => !!entry.meal)
      .sort((a, b) => compareMealsChronologically(a.meal, b.meal));

    for (const { breakdown, meal } of breakdowns) {
      const fromPantry = Math.min(covered, breakdown.quantity);
      covered -= fromPantry;
      const quantity = breakdown.quantity - fromPantry;
      if (quantity <= EPSILON) continue;

      let recipesForDay = days.get(meal.date);
      if (!recipesForDay) {
        recipesForDay = new Map();
        days.set(meal.date, recipesForDay);
      }

      let recipeGroup = recipesForDay.get(meal.recipeId);
      if (!recipeGroup) {
        recipeGroup = {
          recipeName: recipeMap.get(meal.recipeId)?.name ?? 'Recept',
          mealIds: new Set(),
          items: new Map(),
        };
        recipesForDay.set(meal.recipeId, recipeGroup);
      }
      recipeGroup.mealIds.add(meal.id);

      const current = recipeGroup.items.get(item.key);
      recipeGroup.items.set(item.key, {
        key: item.key,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        category: item.category,
        quantity: (current?.quantity ?? 0) + quantity,
        unit: item.missingUnit,
      });
    }
  }

  return Array.from(days.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, recipesForDay]) => ({
      date,
      recipes: Array.from(recipesForDay.entries()).map(([recipeId, group]) => ({
        recipeId,
        recipeName: group.recipeName,
        mealCount: group.mealIds.size,
        mealIds: Array.from(group.mealIds),
        items: Array.from(group.items.values()),
      })),
    }));
}
