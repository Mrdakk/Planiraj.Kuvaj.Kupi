import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ChipRow } from '@/components/ui/ChipRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { RecipePickerField } from '@/components/ui/RecipePickerField';
import { mealTypes, type MealType } from '@/constants/categories';
import { defaultMealServings, parseServings } from '@/features/planner/servings';
import { formatEditableQuantity } from '@/lib/formatQuantity';
import { todayISO } from '@/lib/dates';
import type { Recipe } from '@/types';

export interface MealFormValues {
  recipeId: string;
  date: string;
  mealType: MealType;
  servings: number;
  notes: string;
}

interface MealFormProps {
  recipes: Recipe[];
  initial: Partial<MealFormValues>;
  submitLabel: string;
  /** Cooked meals keep recipe and servings: pantry was already deducted for them. */
  lockRecipeAndServings?: boolean;
  /** Hide the recipe picker when the recipe is fixed by the route. */
  hideRecipePicker?: boolean;
  minimumDate?: string;
  onSubmit: (values: MealFormValues) => Promise<void>;
}

export function MealForm({
  recipes,
  initial,
  submitLabel,
  lockRecipeAndServings = false,
  hideRecipePicker = false,
  minimumDate = todayISO(),
  onSubmit,
}: MealFormProps) {
  const [recipeId, setRecipeId] = useState(initial.recipeId ?? '');
  const [date, setDate] = useState(initial.date ?? todayISO());
  const [mealType, setMealType] = useState<MealType>(initial.mealType ?? 'Ručak');
  const [servingsText, setServingsText] = useState(
    initial.servings ? formatEditableQuantity(initial.servings) : ''
  );
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const servingsForRecipeId = useRef<string | null>(initial.servings ? initial.recipeId ?? null : null);

  const recipe = recipes.find((item) => item.id === recipeId);

  useEffect(() => {
    if (!recipe || servingsForRecipeId.current === recipe.id) return;
    servingsForRecipeId.current = recipe.id;
    setServingsText(String(defaultMealServings(recipe.baseServings)));
    if (!initial.mealType && recipe.mealTypes[0]) setMealType(recipe.mealTypes[0]);
  }, [recipe, initial.mealType]);

  const servings = parseServings(servingsText);
  const servingsError =
    servingsText.trim() && servings === null ? 'Upiši broj porcija, najmanje 1.' : undefined;
  const canSubmit = !!recipeId && !!date && servings !== null && !saving;

  const handleSubmit = async () => {
    if (!canSubmit || servings === null) return;
    setSaving(true);
    try {
      await onSubmit({ recipeId, date, mealType, servings, notes: notes.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pokušaj ponovo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {hideRecipePicker ? (
          recipe ? <Text style={styles.recipeName}>{recipe.name}</Text> : null
        ) : (
          <RecipePickerField
            value={recipeId}
            recipes={recipes}
            onChange={setRecipeId}
            disabled={lockRecipeAndServings}
          />
        )}

        <DateField
          label="Datum"
          value={date}
          onChange={(next) => next && setDate(next)}
          minimumDate={minimumDate}
        />

        <Text style={styles.label}>Tip obroka</Text>
        <ChipRow
          items={mealTypes}
          selected={mealType}
          onSelect={(value) => value && setMealType(value as MealType)}
          allowDeselect={false}
          padded={false}
        />

        <Input
          label="Broj porcija"
          value={servingsText}
          onChangeText={setServingsText}
          keyboardType="decimal-pad"
          editable={!lockRecipeAndServings}
          error={servingsError}
          style={lockRecipeAndServings ? styles.locked : undefined}
        />
        {lockRecipeAndServings ? (
          <Text style={styles.hint}>
            Obrok je skuvan. Da promeniš recept ili porcije, prvo poništi kuvanje.
          </Text>
        ) : null}

        <Input label="Napomena" value={notes} onChangeText={setNotes} multiline />

        <Button title={submitLabel} onPress={handleSubmit} loading={saving} disabled={!canSubmit} />
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
    marginBottom: -spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.md,
  },
  locked: {
    opacity: 0.6,
  },
});
