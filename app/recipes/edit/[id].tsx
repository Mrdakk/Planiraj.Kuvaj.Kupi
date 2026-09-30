import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { RecipeForm } from '@/features/recipes/RecipeForm';
import { updateRecipeWithIngredients, type CreateRecipeInput } from '@/features/recipes/service';
import { useRecipe } from '@/hooks/useRecipes';
import { invalidateAfterRecipeChange } from '@/hooks/invalidate';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';

const screenOptions = { title: 'Izmeni recept' };

export default function EditRecipeScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: recipe, isLoading } = useRecipe(id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: CreateRecipeInput) => {
    if (!recipe || saving) return;
    setSaving(true);
    try {
      const updated = await updateRecipeWithIngredients(recipe, input);
      await invalidateAfterRecipeChange(queryClient);
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
