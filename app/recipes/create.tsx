import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { RecipeForm } from '@/features/recipes/RecipeForm';
import { createRecipeWithIngredients, type CreateRecipeInput } from '@/features/recipes/service';
import { invalidateAfterRecipeChange } from '@/hooks/invalidate';

export default function CreateRecipeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: CreateRecipeInput) => {
    if (saving) return;
    setSaving(true);
    try {
      const recipe = await createRecipeWithIngredients(input);
      await invalidateAfterRecipeChange(queryClient);
      router.replace(`/recipes/${recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju recepta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <RecipeForm onSubmit={handleSubmit} submitTitle="Sačuvaj recept" loading={saving} />
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
});
