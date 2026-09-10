import { convertQuantity, type Unit } from '@/constants/units';
import type { CalculationResult } from '@/calculations/engine';
import type { Meal, Recipe } from '@/types';

export interface DayIngredientRow {
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

function addQuantity(
  existing: DayIngredientRow,
  quantity: number,
  unit: Unit
): DayIngredientRow {
  if (existing.unit === unit) {
    return { ...existing, quantity: existing.quantity + quantity };
  }
  const converted = convertQuantity(quantity, unit, existing.unit);
  if (converted !== null) {
    return { ...existing, quantity: existing.quantity + converted };
  }
  const reverse = convertQuantity(existing.quantity, existing.unit, unit);
  if (reverse !== null) {
    return { ...existing, quantity: reverse + quantity, unit };
  }
  return existing;
}

export function groupMissingByDay(
  missing: CalculationResult[],
  meals: Meal[],
  recipes: Recipe[]
): MissingDayGroup[] {
  const mealMap = new Map(meals.map((meal) => [meal.id, meal]));
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const days = new Map<
    string,
    Map<
      string,
      {
        recipeName: string;
        mealIds: Set<string>;
        items: Map<string, DayIngredientRow>;
      }
    >
  >();

  for (const item of missing) {
    for (const breakdown of item.meals) {
      const meal = mealMap.get(breakdown.mealId);
      if (!meal) continue;
      const recipeName = recipeMap.get(meal.recipeId)?.name ?? 'Recept';

      let recipesForDay = days.get(meal.date);
      if (!recipesForDay) {
        recipesForDay = new Map();
        days.set(meal.date, recipesForDay);
      }

      let recipeGroup = recipesForDay.get(meal.recipeId);
      if (!recipeGroup) {
        recipeGroup = {
          recipeName,
          mealIds: new Set(),
          items: new Map(),
        };
        recipesForDay.set(meal.recipeId, recipeGroup);
      }
      recipeGroup.mealIds.add(meal.id);

      const current = recipeGroup.items.get(item.ingredientId);
      if (current) {
        recipeGroup.items.set(
          item.ingredientId,
          addQuantity(current, breakdown.quantity, breakdown.unit)
        );
      } else {
        recipeGroup.items.set(item.ingredientId, {
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          category: item.category,
          quantity: breakdown.quantity,
          unit: breakdown.unit,
        });
      }
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
