import {
  mealRepository,
  recipeIngredientRepository,
  recipeRepository,
} from '@/services/repositories';
import { todayISO } from '@/lib/dates';
import type { Meal } from '@/types';

function isUpcoming(meal: Meal, today: string): boolean {
  return !meal.isCooked && meal.date >= today;
}

export async function recipeDeletionImpact(
  recipeId: string,
  today = todayISO()
): Promise<{ upcoming: number; past: number }> {
  const meals = await mealRepository.findManyWhere('recipe_id = ?', [recipeId]);
  const upcoming = meals.filter((meal) => isUpcoming(meal, today)).length;
  return { upcoming, past: meals.length - upcoming };
}

/**
 * Meals reference recipes with ON DELETE RESTRICT, so past and cooked meals go
 * first. Planned meals block the delete: the user removes them from the plan.
 */
export async function deleteRecipe(recipeId: string, today = todayISO()): Promise<void> {
  const meals = await mealRepository.findManyWhere('recipe_id = ?', [recipeId]);
  const upcoming = meals.filter((meal) => isUpcoming(meal, today));
  if (upcoming.length > 0) {
    throw new Error(
      upcoming.length === 1
        ? 'Recept je u planu za jedan obrok. Prvo ga ukloni iz plana.'
        : `Recept je u planu za ${upcoming.length} obroka. Prvo ih ukloni iz plana.`
    );
  }

  for (const meal of meals) {
    await mealRepository.delete(meal.id);
  }
  const ingredients = await recipeIngredientRepository.findManyWhere('recipe_id = ?', [recipeId]);
  for (const item of ingredients) {
    await recipeIngredientRepository.delete(item.id);
  }
  await recipeRepository.delete(recipeId);
}
