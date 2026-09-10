import { useQuery } from '@tanstack/react-query';
import { consumptionLogRepository, mealRepository, recipeRepository } from '@/services/repositories';

export function useConsumptionHistory() {
  return useQuery({
    queryKey: ['consumptionLogs'],
    queryFn: async () => {
      const logs = await consumptionLogRepository.findAll('consumed_at DESC');
      const meals = await mealRepository.findAll();
      const recipes = await recipeRepository.findAll();
      const mealMap = new Map(meals.map((m) => [m.id, m]));
      const recipeMap = new Map(recipes.map((r) => [r.id, r]));

      return logs.map((log) => ({
        ...log,
        meal: mealMap.get(log.mealId) ?? null,
        recipe: mealMap.get(log.mealId)?.recipeId
          ? recipeMap.get(mealMap.get(log.mealId)!.recipeId) ?? null
          : null,
      }));
    },
  });
}
