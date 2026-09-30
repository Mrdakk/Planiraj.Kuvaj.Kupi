import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMeal } from '@/hooks/useMealPlans';
import { useRecipes } from '@/hooks/useRecipes';
import { invalidateAfterMealChange } from '@/hooks/invalidate';
import { ensureMealPlanForDate, assertMealDateNotPast } from '@/features/planner/service';
import { MealForm } from '@/features/planner/MealForm';
import { mealRepository } from '@/services/repositories';
import { nowISO } from '@/database/repository';
import { todayISO } from '@/lib/dates';

const screenOptions = { title: 'Izmeni obrok' };

export default function EditMealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: meal, isLoading } = useMeal(id);
  const { data: recipes, isLoading: recipesLoading } = useRecipes();

  if (isLoading || recipesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={screenOptions} />
        <Text style={styles.loadingText}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  if (!meal) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={screenOptions} />
        <EmptyState
          title="Obrok nije pronađen"
          message="Možda je obrisan na drugom uređaju."
          actionTitle="Nazad"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const today = todayISO();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />
      <MealForm
        recipes={recipes ?? []}
        initial={{
          recipeId: meal.recipeId,
          date: meal.date,
          mealType: meal.mealType,
          servings: meal.servings,
          notes: meal.notes ?? '',
        }}
        minimumDate={meal.date < today ? meal.date : today}
        lockRecipeAndServings={meal.isCooked}
        submitLabel="Sačuvaj izmene"
        onSubmit={async (values) => {
          if (values.date !== meal.date) {
            assertMealDateNotPast(values.date);
          }
          const plan = await ensureMealPlanForDate(values.date);
          await mealRepository.update({
            ...meal,
            mealPlanId: plan.id,
            recipeId: meal.isCooked ? meal.recipeId : values.recipeId,
            servings: meal.isCooked ? meal.servings : values.servings,
            date: values.date,
            mealType: values.mealType,
            notes: values.notes || null,
            updatedAt: nowISO(),
          });
          await invalidateAfterMealChange(queryClient, meal.id);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
