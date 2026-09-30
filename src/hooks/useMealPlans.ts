import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { mealPlanRepository, mealRepository } from '@/services/repositories';

export function useMealPlan(weekStart: string) {
  return useQuery({
    queryKey: [...queryKeys.mealPlans, weekStart],
    queryFn: async () => {
      const plans = await mealPlanRepository.findManyWhere('week_start = ?', [weekStart]);
      return plans[0] ?? null;
    },
  });
}

export function useMeals(planId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.meals(planId ?? ''),
    queryFn: () => mealRepository.findManyWhere('meal_plan_id = ?', [planId ?? '']),
    enabled: !!planId,
  });
}

export function useMeal(id: string) {
  return useQuery({
    queryKey: queryKeys.meal(id),
    queryFn: () => mealRepository.findById(id),
    enabled: !!id,
  });
}
