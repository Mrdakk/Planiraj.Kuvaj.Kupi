import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
        category: data.category,
        steps: data.steps.split('\n').map((s) => s.trim()).filter(Boolean),
        notes: data.notes,
        ingredients: data.ingredients.map((i) => ({
          id: i.id,
          ingredientId: i.ingredientId,
          rawName: i.rawName,
          quantity: parseQuantity(i.quantity),
          unit: i.unit,
          notes: i.notes,
        })),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipe(updated.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems });
      await queryClient.invalidateQueries({ queryKey: queryKeys.missing });
      router.replace(`/recipes/${updated.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju recepta');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState title="Recept nije pronađen" message="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Izmeni recept</Text>
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
  title: {
    ...typography.h1,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
