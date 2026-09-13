import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { RecipeForm } from '@/features/recipes/RecipeForm';
import { updateRecipeWithIngredients } from '@/features/recipes/service';
import { useRecipe } from '@/hooks/useRecipes';
import { queryKeys } from '@/hooks/queryKeys';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import type { RecipeFormData } from '@/features/recipes/RecipeForm';
import { parseQuantity } from '@/lib/formatQuantity';

export default function EditRecipeScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: recipe, isLoading } = useRecipe(id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: RecipeFormData) => {
    if (!recipe) return;
    setSaving(true);
    try {
      const updated = await updateRecipeWithIngredients(recipe, {
        name: data.name,
        description: data.description,
        baseServings: data.baseServings,
        prepTimeMinutes: data.prepTimeMinutes,
        mealTypes: data.mealTypes,
        dishType: data.dishType || null,
        steps: data.steps.split('\n').map((s) => s.trim()).filter(Boolean),
        notes: data.notes,
        ingredients: data.ingredients.map((i) => ({
          id: i.id,
          ingredientId: i.ingredientId,
          rawName: i.rawName,
          sourceName: i.sourceName,
          linkToIngredientId: i.linkToIngredientId,
          quantity: parseQuantity(i.quantity),
          unit: i.unit,
          notes: i.notes,
        })),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipe(updated.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      router.replace(`/recipes/${updated.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju recepta');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Izmeni recept' }} />
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Izmeni recept' }} />
        <EmptyState title="Recept nije pronađen" message="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Izmeni recept' }} />
      <RecipeForm
        defaultValues={recipe}
        onSubmit={handleSubmit}
        submitTitle="Sačuvaj izmene"
        loading={saving}
      />
      <ConfirmSheet
        visible={error !== null}
        title="Nije sačuvano"
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
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
