import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { mealTypes, type MealType } from '@/constants/categories';
import { addMeal, ensureMealPlanForDate } from '@/features/planner/service';
import { MealForm } from '@/features/planner/MealForm';
import { useRecipes } from '@/hooks/useRecipes';
import { invalidateAfterMealChange } from '@/hooks/invalidate';
import { todayISO } from '@/lib/dates';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asMealType(value: string | undefined): MealType | undefined {
  return (mealTypes as readonly string[]).includes(value ?? '') ? (value as MealType) : undefined;
}

export default function CreateMealScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ recipeId?: string; date?: string; mealType?: string }>();
  const { data: recipes } = useRecipes();
  const today = todayISO();
  const dateParam = firstParam(params.date);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Dodaj obrok' }} />
      <MealForm
        recipes={recipes ?? []}
        initial={{
          recipeId: firstParam(params.recipeId),
          date: dateParam && dateParam >= today ? dateParam : today,
          mealType: asMealType(firstParam(params.mealType)),
        }}
        submitLabel="Dodaj u plan"
        onSubmit={async (values) => {
          const plan = await ensureMealPlanForDate(values.date);
          await addMeal(plan.id, values.date, values.mealType, values.recipeId, values.servings, values.notes);
          await invalidateAfterMealChange(queryClient);
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
});
