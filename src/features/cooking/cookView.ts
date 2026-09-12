import { scaleQuantity } from '@/calculations/engine';
import type { Unit } from '@/constants/units';
import { displayIngredientName } from '@/lib/ingredientNames';
import type { Meal, RecipeIngredient, RecipeWithIngredients } from '@/types';

export interface MealCookIngredient {
  id: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: Unit;
  notes: string | null;
}

export interface MealCookView {
  ingredients: MealCookIngredient[];
  steps: string[];
  mealNotes: string | null;
  recipeNotes: string | null;
  recipeId: string;
  servings: number;
  baseServings: number;
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function ingredientName(
  item: RecipeIngredient,
  catalogNames?: Map<string, string>
): string {
  const fromRecipe = item.ingredientName?.trim();
  if (fromRecipe) return displayIngredientName(fromRecipe);
  const fromCatalog = catalogNames?.get(item.ingredientId)?.trim();
  if (fromCatalog) return displayIngredientName(fromCatalog);
  return 'Sastojak';
}

export function buildMealCookView(
  meal: Meal,
  recipe: RecipeWithIngredients,
  catalogNames?: Map<string, string>
): MealCookView {
  const ingredients = [...recipe.ingredients]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      name: ingredientName(item, catalogNames),
      quantity: scaleQuantity(item.quantity, recipe.baseServings, meal.servings),
      unit: item.unit,
      notes: trimOrNull(item.notes),
    }));

  return {
    ingredients,
    steps: recipe.steps.map((step) => step.trim()).filter(Boolean),
    mealNotes: trimOrNull(meal.notes),
    recipeNotes: trimOrNull(recipe.notes),
    recipeId: recipe.id,
    servings: meal.servings,
    baseServings: recipe.baseServings,
  };
}
