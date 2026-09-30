import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppSheet, SheetFooter } from '@/components/ui/AppSheet';
import { Button } from '@/components/ui/Button';
import { ChipRow } from '@/components/ui/ChipRow';
import { DateField } from '@/components/ui/DateField';
import { ListRow } from '@/components/ui/ListRow';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { mealTypes, type MealType } from '@/constants/categories';
import { getRecipeEmoji } from '@/constants/emojis';
import { colors, spacing, typography } from '@/constants/theme';
import { isPastDay } from '@/features/planner/service';
import { suggestMeals, type MealSuggestion } from '@/features/planner/suggestMeals';
import { useIngredients } from '@/hooks/useIngredients';
import { usePantryItems } from '@/hooks/usePantryItems';
import { useAllRecipeIngredients, useRecipes } from '@/hooks/useRecipes';
import { todayISO } from '@/lib/dates';
import type { Meal } from '@/types';

export function SuggestMealSheet({
  visible,
  onClose,
  defaultDate,
  weekMeals,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  defaultDate: string;
  weekMeals: Meal[];
  onPick: (selection: { recipeId: string; date: string; mealType: MealType }) => void;
}) {
  const today = todayISO();
  const [date, setDate] = useState(defaultDate);
  const [mealType, setMealType] = useState<MealType>('Ručak');
  const [brzi, setBrzi] = useState(false);
  const [step, setStep] = useState<'filters' | 'results'>('filters');
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);

  const { data: recipes, isLoading: recipesLoading } = useRecipes();
  const { data: recipeIngredients, isLoading: ingredientsLoading } = useAllRecipeIngredients();
  const { data: ingredients, isLoading: catalogLoading } = useIngredients();
  const { data: pantryItems, isLoading: pantryLoading } = usePantryItems();
  const loading = recipesLoading || ingredientsLoading || catalogLoading || pantryLoading;

  useEffect(() => {
    if (!visible) return;
    setDate(isPastDay(defaultDate, today) ? today : defaultDate);
    setMealType('Ručak');
    setBrzi(false);
    setStep('filters');
    setSuggestions([]);
  }, [visible, defaultDate, today]);

  const showSuggestions = () => {
    const next = suggestMeals({
      mealType,
      pace: brzi ? 'brzi' : 'klasican',
      recipes: recipes ?? [],
      recipeIngredients: recipeIngredients ?? [],
      ingredients: ingredients ?? [],
      pantryItems: pantryItems ?? [],
      weekMeals,
    });
    setSuggestions(next);
    setStep('results');
  };

  const missingLabel = (count: number) => (count === 0 ? 'Sve imaš' : `Fali ${count}`);
  const timeLabel = (minutes: number | null) =>
    minutes == null ? 'Vreme nije uneto' : `${minutes} min`;

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="Predloži obrok"
      subtitle={step === 'filters' ? 'Izaberi datum, tip i tempo.' : 'Izaberi jedan od predloga.'}
      icon="sparkles-outline"
      footer={
        step === 'filters' ? (
          <SheetFooter
            cancelLabel="Otkaži"
            confirmLabel="Prikaži predloge"
            onCancel={onClose}
            onConfirm={showSuggestions}
            loading={loading}
            confirmDisabled={loading}
          />
        ) : (
          <SheetFooter
            cancelLabel="Zatvori"
            onCancel={onClose}
            confirmLabel="Nazad na filtere"
            confirmVariant="secondary"
            onConfirm={() => setStep('filters')}
          />
        )
      }
    >
      {step === 'filters' ? (
        <View style={styles.filters}>
          <DateField
            label="Datum"
            value={date}
            onChange={(next) => next && setDate(next)}
            minimumDate={today}
          />
          <Text style={styles.label}>Tip obroka</Text>
          <ChipRow
            items={mealTypes}
            selected={mealType}
            onSelect={(value) => value && setMealType(value as MealType)}
            allowDeselect={false}
            padded={false}
          />
          <ToggleRow
            label="Brzi obrok"
            value={brzi}
            onValueChange={setBrzi}
            subtitle={
              brzi
                ? 'Što više iz ostave, što manje dokupa, što kraće vreme.'
                : 'Klasičan — vreme i ostava nisu prioritet'
            }
          />
        </View>
      ) : suggestions.length === 0 ? (
        <Text style={styles.empty}>Nema dovoljno recepata za ovaj tip.</Text>
      ) : (
        <View style={styles.results}>
          {suggestions.map((item) => (
            <View key={item.recipe.id} style={styles.card}>
              <ListRow
                emoji={getRecipeEmoji(item.recipe.name, item.recipe.emoji)}
                title={item.recipe.name}
                subtitle={`${missingLabel(item.missingCount)} · ${timeLabel(item.prepTimeMinutes)}`}
                plain
              />
              <Button
                title="Izaberi"
                onPress={() =>
                  onPick({ recipeId: item.recipe.id, date, mealType })
                }
              />
            </View>
          ))}
        </View>
      )}
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  results: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
