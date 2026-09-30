import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { addMeal, ensureMealPlanForDate } from '@/features/planner/service';
import { MealForm } from '@/features/planner/MealForm';
import { useRecipe } from '@/hooks/useRecipes';
import { invalidateAfterMealChange } from '@/hooks/invalidate';
import { todayISO } from '@/lib/dates';

const screenOptions = { title: 'Dodaj u plan' };

export default function AddToPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: recipe, isLoading } = useRecipe(id);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={screenOptions} />
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={screenOptions} />
        <EmptyState
          title="Recept nije pronađen"
          message="Možda je obrisan."
          actionTitle="Nazad"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />
      <MealForm
        recipes={[recipe]}
        initial={{ recipeId: recipe.id, date: todayISO() }}
        hideRecipePicker
        submitLabel="Dodaj u plan"
        onSubmit={async (values) => {
          const plan = await ensureMealPlanForDate(values.date);
          await addMeal(plan.id, values.date, values.mealType, recipe.id, values.servings, values.notes);
          await invalidateAfterMealChange(queryClient);
          router.replace('/');
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
