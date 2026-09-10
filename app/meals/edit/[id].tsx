import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecipePickerField } from '@/components/ui/RecipePickerField';
import { useMeal, useUpdateMeal } from '@/hooks/useMealPlans';
import { useRecipes } from '@/hooks/useRecipes';
import { ensureMealPlanForDate, assertMealDateNotPast } from '@/features/planner/service';
import { mealTypes, type MealType } from '@/constants/categories';
import { queryKeys } from '@/hooks/queryKeys';
import { nowISO } from '@/database/repository';
import { useQueryClient } from '@tanstack/react-query';
import { todayISO } from '@/lib/dates';

const screenOptions = { title: 'Izmeni obrok' };

export default function EditMealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: meal, isLoading } = useMeal(id);
  const { data: recipes } = useRecipes();
  const updateMeal = useUpdateMeal();
  const queryClient = useQueryClient();

  const [recipeId, setRecipeId] = useState('');
  const [date, setDate] = useState('');
  const [mealType, setMealType] = useState<MealType>('Ručak');
  const [servings, setServings] = useState('4');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meal) {
      setRecipeId(meal.recipeId);
      setDate(meal.date);
      setMealType(meal.mealType);
      setServings(String(meal.servings));
      setNotes(meal.notes ?? '');
    }
  }, [meal]);

  const handleSubmit = async () => {
    if (!meal || !recipeId || !date) return;
    setLoading(true);
    try {
      if (date !== meal.date) {
        assertMealDateNotPast(date);
      }
      const plan = await ensureMealPlanForDate(date);
      await updateMeal.mutateAsync({
        ...meal,
        mealPlanId: plan.id,
        recipeId,
        date,
        mealType,
        servings: Number(servings) || 4,
        notes: notes.trim() || null,
        updatedAt: nowISO(),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans });
      await queryClient.invalidateQueries({ queryKey: queryKeys.missing });
      router.back();
    } catch {
      // DateField already blocks past dates; keep the form open.
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
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
        <EmptyState title="Obrok nije pronađen" message="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />
      <View style={styles.content}>
        <RecipePickerField
          value={recipeId}
          recipes={recipes ?? []}
          onChange={setRecipeId}
        />

        <DateField label="Datum" value={date} onChange={(next) => next && setDate(next)} minimumDate={todayISO()} />

        <Text style={styles.label}>Tip obroka</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={mealType} onValueChange={(value) => setMealType(value as MealType)}>
            {mealTypes.map((type) => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
        </View>

        <Input
          label="Broj porcija"
          value={servings}
          onChangeText={setServings}
          keyboardType="numeric"
        />

        <Input
          label="Napomena"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Button
          title="Sačuvaj izmene"
          onPress={handleSubmit}
          loading={loading}
          disabled={!recipeId || !date}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
