import { useQuery } from '@tanstack/react-query';
import { mealPlanRepository, mealRepository, recipeRepository, recipeIngredientRepository, pantryItemRepository, ingredientRepository } from '@/services/repositories';
import { calculate } from '@/calculations/engine';
import type { CalculationOutput } from '@/calculations/engine';

export function useMissingCalculation(weekStart: string) {
  return useQuery<CalculationOutput>({
    queryKey: ['missing', weekStart],
    queryFn: async () => {
      const plans = await mealPlanRepository.findManyWhere('week_start = ?', [weekStart]);
      const plan = plans[0] ?? null;

      const [meals, recipes, recipeIngredients, pantryItems, ingredients] = await Promise.all([
        plan ? mealRepository.findManyWhere('meal_plan_id = ?', [plan.id]) : [],
        recipeRepository.findAll(),
        recipeIngredientRepository.findAll(),
        pantryItemRepository.findAll(),
        ingredientRepository.findAll(),
      ]);

      return calculate({
        ingredients,
        recipes,
        recipeIngredients,
        meals,
        pantryItems,
      });
    },
  });
}
