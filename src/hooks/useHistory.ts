import { useQuery } from '@tanstack/react-query';
import { mealRepository, recipeRepository } from '@/services/repositories';
import { buildCookedMealHistory } from '@/features/cooking/history';
import { queryKeys } from './queryKeys';

export function useCookedMealHistory() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: async () => {
      const [meals, recipes] = await Promise.all([
        mealRepository.findAll(),
        recipeRepository.findAll(),
      ]);
      return buildCookedMealHistory(meals, recipes);
    },
  });
}
