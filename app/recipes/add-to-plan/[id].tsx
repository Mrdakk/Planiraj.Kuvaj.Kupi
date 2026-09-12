import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { mealTypes, type MealType } from '@/constants/categories';
import { addMeal, ensureMealPlan, getWeekStart } from '@/features/planner/service';
import { defaultMealServings } from '@/features/planner/servings';
import { useRecipe } from '@/hooks/useRecipes';
import { queryKeys } from '@/hooks/queryKeys';
import { parseISODate, todayISO } from '@/lib/dates';

export default function AddToPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: recipe, isLoading } = useRecipe(id);

  const [date, setDate] = useState(todayISO());
  const [mealType, setMealType] = useState<MealType>('Ručak');
  const [servings, setServings] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const defaultType = recipe?.mealTypes[0];
    if (defaultType) setMealType(defaultType);
  }, [recipe]);

  const servingsValue = servings || String(defaultMealServings(recipe?.baseServings));

  const handleSubmit = async () => {
    if (!recipe || !date || saving) return;
    setSaving(true);
    try {
      const weekStart = getWeekStart(parseISODate(date) ?? new Date());
      const plan = await ensureMealPlan(weekStart);
      await addMeal(
        plan.id,
        date,
        mealType,
        recipe.id,
        Math.max(1, Number(servingsValue) || defaultMealServings(recipe.baseServings)),
        notes
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans });
      await queryClient.invalidateQueries({ queryKey: queryKeys.meals(plan.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.missing });
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pokušaj ponovo.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Dodaj u plan' }} />
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Dodaj u plan' }} />
        <EmptyState title="Recept nije pronađen" message="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Dodaj u plan' }} />
      <View style={styles.content}>
        <Text style={styles.recipeName}>{recipe.name}</Text>
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
          value={servingsValue}
          onChangeText={setServings}
          keyboardType="numeric"
        />

        <Input label="Napomena" value={notes} onChangeText={setNotes} multiline />

        <Button title="Dodaj u plan" onPress={handleSubmit} loading={saving} disabled={!date} />
      </View>
      <ConfirmSheet
        visible={error !== null}
        title="Obrok nije sačuvan"
        message={error ?? ''}
        confirmLabel="U redu"
        variant="warning"
        hideCancel
        onConfirm={() => setError(null)}
        onCancel={() => setError(null)}
      />
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
  recipeName: {
    ...typography.h3,
    color: colors.text,
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
