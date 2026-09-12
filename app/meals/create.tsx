import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { RecipePickerField } from '@/components/ui/RecipePickerField';
import { mealTypes, type MealType } from '@/constants/categories';
import { addMeal, ensureMealPlan, getWeekStart } from '@/features/planner/service';
import { defaultMealServings } from '@/features/planner/servings';
import { useRecipes } from '@/hooks/useRecipes';
import { queryKeys } from '@/hooks/queryKeys';
import { parseISODate, todayISO } from '@/lib/dates';

const screenOptions = { title: 'Dodaj obrok' };

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asMealType(value: string | undefined): MealType {
  return (mealTypes as readonly string[]).includes(value ?? '') ? (value as MealType) : 'Ručak';
}

export default function CreateMealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipeId?: string; date?: string; mealType?: string }>();
  const { data: recipes } = useRecipes();
  const today = todayISO();
  const recipeIdParam = firstParam(params.recipeId);
  const dateParam = firstParam(params.date);
  const initialDate = dateParam && dateParam >= today ? dateParam : today;
  const [recipeId, setRecipeId] = useState(recipeIdParam ?? '');
  const [date, setDate] = useState(initialDate);
  const [mealType, setMealType] = useState<MealType>(asMealType(firstParam(params.mealType)));
  const [servings, setServings] = useState('4');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const servingsForRecipeId = useRef<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!recipeId || servingsForRecipeId.current === recipeId) return;
    const found = recipes?.find((recipe) => recipe.id === recipeId);
    if (!found) return;
    setServings(String(defaultMealServings(found.baseServings)));
    servingsForRecipeId.current = recipeId;
  }, [recipes, recipeId]);

  const handleSubmit = async () => {
    if (!recipeId || !date || loading) return;
    setLoading(true);
    try {
      const found = recipes?.find((recipe) => recipe.id === recipeId);
      const weekStart = getWeekStart(parseISODate(date) ?? new Date());
      const plan = await ensureMealPlan(weekStart);
      await addMeal(
        plan.id,
        date,
        mealType,
        recipeId,
        Number(servings) || defaultMealServings(found?.baseServings),
        notes
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans });
      await queryClient.invalidateQueries({ queryKey: queryKeys.meals(plan.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.missing });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pokušaj ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />
      <View style={styles.content}>
        <RecipePickerField
          value={recipeId}
          recipes={recipes ?? []}
          onChange={setRecipeId}
        />

        <DateField label="Datum" value={date} onChange={(next) => next && setDate(next)} minimumDate={today} />

        <Text style={styles.label}>Tip obroka</Text>
        <View style={styles.pickerContainer}>
          <Picker dropdownIconColor={colors.text} style={{ color: colors.text }} selectedValue={mealType} onValueChange={(value) => setMealType(value as MealType)}>
            {mealTypes.map((type) => (
              <Picker.Item color={colors.text} key={type} label={type} value={type} />
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
          title="Dodaj u plan"
          onPress={handleSubmit}
          loading={loading}
          disabled={!recipeId || !date}
        />
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
});
