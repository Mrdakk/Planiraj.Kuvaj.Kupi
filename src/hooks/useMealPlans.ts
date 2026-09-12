import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { mealPlanRepository, mealRepository } from '@/services/repositories';
import { deleteMeal } from '@/features/planner/service';
import type { Meal, MealPlan } from '@/types';

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

export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plan: MealPlan) => mealPlanRepository.insert(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans });
    },
  });
}

export function useCreateMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meal: Meal) => mealRepository.insert(meal),
    onSuccess: (_, meal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meal(meal.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.meals(meal.mealPlanId) });
    },
  });
}

export function useUpdateMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meal: Meal) => mealRepository.update(meal),
    onSuccess: (_, meal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meal(meal.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.meals(meal.mealPlanId) });
    },
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meal: Meal) => deleteMeal(meal),
    onSuccess: (_, meal) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meal(meal.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.meals(meal.mealPlanId) });
    },
  });
}
