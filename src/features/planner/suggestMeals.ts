import { calculate } from '@/calculations/engine';
import { recipeHasMealType } from '@/features/recipes/classification';
import type { MealType } from '@/constants/categories';
import type { Ingredient, Meal, PantryItem, Recipe, RecipeIngredient } from '@/types';

export type MealPace = 'brzi' | 'klasican';

export interface SuggestMealsInput {
  mealType: MealType;
  pace: MealPace;
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  ingredients: Ingredient[];
  pantryItems: PantryItem[];
  weekMeals: Meal[];
}

export interface MealSuggestion {
  recipe: Recipe;
  missingCount: number;
  pantryCoverage: number;
  prepTimeMinutes: number | null;
  score: number;
}

export function recipeMatchesMealType(recipe: Recipe, mealType: MealType): boolean {
  return recipeHasMealType(recipe, mealType);
}

function timeScore(prepTimeMinutes: number | null): number {
  if (prepTimeMinutes == null) return 0.5;
  return 1 - Math.min(prepTimeMinutes, 120) / 120;
}

function missingScore(missingCount: number): number {
  return 1 - Math.min(missingCount, 8) / 8;
}

function brziScore(coverage: number, missingCount: number, prepTimeMinutes: number | null): number {
  return 0.45 * coverage + 0.35 * missingScore(missingCount) + 0.2 * timeScore(prepTimeMinutes);
}

function klasicanScore(recipe: Recipe, weekMeals: Meal[]): number {
  const onThisWeek = weekMeals.some((item) => item.recipeId === recipe.id);
  const cookedThisWeek = weekMeals.some((item) => item.recipeId === recipe.id && item.isCooked);
  return (onThisWeek ? 0 : 1) * 0.5 + (cookedThisWeek ? 0 : 1) * 0.3 + (recipe.isFavorite ? 1 : 0) * 0.2;
}

function scoreRecipe(
  recipe: Recipe,
  input: SuggestMealsInput
): { missingCount: number; pantryCoverage: number } {
  const recipeIngredients = input.recipeIngredients.filter((item) => item.recipeId === recipe.id);
  const ingredientCount = recipeIngredients.length;
  const virtualMeal: Meal = {
    id: `suggest-${recipe.id}`,
    mealPlanId: 'suggest',
    date: '2099-01-01',
    mealType: input.mealType,
    recipeId: recipe.id,
    servings: recipe.baseServings,
    notes: null,
    isCooked: false,
    createdAt: '',
    updatedAt: '',
  };
  const usedIds = new Set(recipeIngredients.map((item) => item.ingredientId));
  const ingredients = input.ingredients.filter((item) => usedIds.has(item.id));
  const output = calculate({
    ingredients,
    recipes: [recipe],
    recipeIngredients,
    meals: [virtualMeal],
    pantryItems: input.pantryItems,
  });
  const missingCount = output.missing.filter((item) => item.meals.length > 0).length;
  const pantryCoverage = 1 - missingCount / Math.max(1, ingredientCount);
  return { missingCount, pantryCoverage };
}

function toSuggestion(
  recipe: Recipe,
  metrics: { missingCount: number; pantryCoverage: number },
  score: number
): MealSuggestion {
  return {
    recipe,
    missingCount: metrics.missingCount,
    pantryCoverage: metrics.pantryCoverage,
    prepTimeMinutes: recipe.prepTimeMinutes,
    score,
  };
}

function rankBy(
  recipes: Recipe[],
  input: SuggestMealsInput,
  scoreOf: (recipe: Recipe, metrics: { missingCount: number; pantryCoverage: number }) => number
): MealSuggestion[] {
  return recipes
    .map((recipe) => {
      const metrics = scoreRecipe(recipe, input);
      return toSuggestion(recipe, metrics, scoreOf(recipe, metrics));
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.recipe.id.localeCompare(b.recipe.id);
    });
}

export function suggestMeals(input: SuggestMealsInput): MealSuggestion[] {
  const typed = input.recipes.filter((recipe) => recipeMatchesMealType(recipe, input.mealType));
  const pool = typed.length > 0 ? typed : input.recipes;
  const brziRanked = rankBy(pool, input, (recipe, metrics) =>
    brziScore(metrics.pantryCoverage, metrics.missingCount, recipe.prepTimeMinutes)
  );
  const brziTop = brziRanked.slice(0, 3);

  if (input.pace === 'brzi') {
    return brziTop;
  }

  const excluded = new Set(brziTop.map((item) => item.recipe.id));
  const remaining = pool.filter((recipe) => !excluded.has(recipe.id));
  return rankBy(remaining, input, (recipe) => klasicanScore(recipe, input.weekMeals)).slice(0, 3);
}
