import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { RecipeForm } from '@/features/recipes/RecipeForm';
import { createRecipeWithIngredients } from '@/features/recipes/service';
import type { RecipeFormData } from '@/features/recipes/RecipeForm';
import { parseQuantity } from '@/lib/formatQuantity';
import { queryKeys } from '@/hooks/queryKeys';

export default function CreateRecipeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: RecipeFormData) => {
    setSaving(true);
    try {
      const recipe = await createRecipeWithIngredients({
        name: data.name,
        description: data.description,
        baseServings: data.baseServings,
        prepTimeMinutes: data.prepTimeMinutes,
        category: data.category,
        steps: data.steps.split('\n').map((s) => s.trim()).filter(Boolean),
        notes: data.notes,
        ingredients: data.ingredients.map((i) => ({
          rawName: i.rawName,
          quantity: parseQuantity(i.quantity),
          unit: i.unit,
          notes: i.notes,
        })),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems });
      await queryClient.invalidateQueries({ queryKey: queryKeys.missing });
      router.replace(`/recipes/${recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju recepta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Novi recept</Text>
      <RecipeForm
        onSubmit={handleSubmit}
        submitTitle="Sačuvaj recept"
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
});
