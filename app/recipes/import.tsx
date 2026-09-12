import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmojiBadge } from '@/components/ui/EmojiBadge';
import { Input } from '@/components/ui/Input';
import { createRecipeWithIngredients } from '@/features/recipes/service';
import { importRecipeFromUrl, type ImportedRecipe } from '@/features/recipes/importFromUrl';
import { queryKeys } from '@/hooks/queryKeys';
import { formatAmount } from '@/lib/formatQuantity';
import { formatServings } from '@/lib/formatServings';
import { displayIngredientName } from '@/lib/ingredientNames';
import { getIngredientEmoji, getRecipeEmoji } from '@/constants/emojis';

export default function ImportRecipeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ImportedRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRead = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const imported = await importRecipeFromUrl(url);
      setPreview(imported);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proveri link i internet, pa pokušaj ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || saving) return;
    setSaving(true);
    try {
      const recipe = await createRecipeWithIngredients(preview);
      await queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      router.replace(`/recipes/${recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recept nije sačuvan. Pokušaj ponovo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Uvoz iz linka' }} />
      {preview ? (
        <ScrollView contentContainerStyle={styles.preview} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <EmojiBadge emoji={getRecipeEmoji(preview.name, preview.emoji)} size={56} />
            <Text style={styles.title}>{preview.name}</Text>
          </View>
          {preview.dishType ? <Text style={styles.meta}>{preview.dishType}</Text> : null}
          {preview.mealTypes?.length ? (
            <Text style={styles.meta}>{preview.mealTypes.join(' · ')}</Text>
          ) : null}
          <Text style={styles.meta}>{formatServings(preview.baseServings)}</Text>
          {preview.prepTimeMinutes ? (
            <Text style={styles.meta}>Vreme pripreme: {preview.prepTimeMinutes} min</Text>
          ) : null}
          {preview.description ? <Text style={styles.body}>{preview.description}</Text> : null}

          <Text style={styles.sectionTitle}>Sastojci</Text>
          {preview.ingredients.map((item, index) => {
            const name = displayIngredientName(item.rawName);
            return (
              <Card key={`${item.rawName}-${index}`} style={styles.ingredientCard}>
                <View style={styles.ingredientRow}>
                  <EmojiBadge emoji={getIngredientEmoji(name)} size={36} name={name} />
                  <View style={styles.ingredientBody}>
                    <Text style={styles.ingredientName}>{name}</Text>
                    <Text style={styles.ingredientQuantity}>
                      {formatAmount(item.quantity, item.unit)}
                    </Text>
                    {item.notes ? <Text style={styles.note}>{item.notes}</Text> : null}
                  </View>
                </View>
              </Card>
            );
          })}

          {preview.steps.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Koraci pripreme</Text>
              {preview.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{index + 1}.</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </>
          ) : null}

          <View style={styles.actions}>
            <Button title="Sačuvaj recept" onPress={handleSave} loading={saving} disabled={saving} />
            <Button
              title="Otkaži"
              onPress={() => setPreview(null)}
              variant="secondary"
              disabled={saving}
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <Text style={styles.help}>
            Nalepi link recepta. Prvo ćeš videti pregled, pa tek onda biraš da sačuvaš. Kuhinja se
            ne menja.
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
            title="Učitaj recept"
            onPress={handleRead}
            loading={loading}
            disabled={!url.trim() || loading}
          />
        </View>
      )}
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
  preview: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    flex: 1,
  },
  meta: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  ingredientCard: {
    marginBottom: spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ingredientBody: {
    flex: 1,
  },
  ingredientName: {
    ...typography.h3,
    color: colors.text,
  },
  ingredientQuantity: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  note: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  stepNumber: {
    ...typography.body,
    color: colors.primary,
    width: 28,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
