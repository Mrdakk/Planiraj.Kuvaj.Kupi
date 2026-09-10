import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { createRecipeWithIngredients } from '@/features/recipes/service';
import { importRecipeFromUrl } from '@/features/recipes/importFromUrl';
import { queryKeys } from '@/hooks/queryKeys';

export default function ImportRecipeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    try {
      const imported = await importRecipeFromUrl(url);
      const recipe = await createRecipeWithIngredients(imported);
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems });
      await queryClient.invalidateQueries({ queryKey: queryKeys.missing });
      router.replace(`/recipes/${recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proveri link i internet, pa pokušaj ponovo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Uvoz iz linka" />
      <View style={styles.content}>
        <Text style={styles.help}>
          Nalepi link recepta. Groq će pročitati stranicu i odmah sačuvati recept. Možeš ga
          posle ispraviti preko Uredi.
        </Text>
        <Input
          label="Link"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://www.coolinarika.com/recept/..."
        />
        <Button
          title="Ubaci recept"
          onPress={handleImport}
          loading={loading}
          disabled={!url.trim()}
        />
      </View>
      <ConfirmSheet
        visible={error !== null}
        title="Uvoz nije uspeo"
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
  help: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
