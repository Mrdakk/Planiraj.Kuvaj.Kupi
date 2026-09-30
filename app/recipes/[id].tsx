import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, hit, layout } from '@/constants/theme';
import { recipeDeletionImpact } from '@/features/recipes/deleteRecipe';
import { useRecipe, useDeleteRecipe, useToggleFavorite } from '@/hooks/useRecipes';
import { useIngredients } from '@/hooks/useIngredients';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmojiBadge } from '@/components/ui/EmojiBadge';
import { formatAmount } from '@/lib/formatQuantity';
import { formatServings } from '@/lib/formatServings';
import { displayIngredientName } from '@/lib/ingredientNames';
import { getRecipeEmoji, getIngredientEmoji } from '@/constants/emojis';
import { useIngredientEmojiEditor } from '@/features/ingredients/IngredientEmojiSheet';
import { isCreatedToday } from '@/lib/dates';
import { NewBadge } from '@/components/ui/NewBadge';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipe(id);
  const { data: ingredients } = useIngredients();
  const deleteRecipe = useDeleteRecipe();
  const toggleFavorite = useToggleFavorite();

  const [deletePrompt, setDeletePrompt] = useState<
    { kind: 'confirm'; message: string } | { kind: 'error'; message: string } | null
  >(null);
  const { editIngredientEmoji, ingredientEmojiSheet } = useIngredientEmojiEditor();

  const ingredientMap = new Map(ingredients?.map((i) => [i.id, i]) ?? []);

  const handleDelete = async () => {
    const impact = await recipeDeletionImpact(id);
    if (impact.upcoming > 0) {
      setDeletePrompt({
        kind: 'error',
        message:
          impact.upcoming === 1
            ? 'Recept je u planu za jedan obrok. Prvo ga ukloni iz plana, pa obriši recept.'
            : `Recept je u planu za ${impact.upcoming} obroka. Prvo ih ukloni iz plana, pa obriši recept.`,
      });
      return;
    }
    setDeletePrompt({
      kind: 'confirm',
      message:
        impact.past > 0
          ? 'Recept i njegovi prošli obroci nestaju iz istorije. Ovo se ne može opozvati.'
          : 'Recept se briše. Ovo se ne može opozvati.',
    });
  };

  const confirmDeleteRecipe = () => {
    deleteRecipe.mutate(id, {
      onSuccess: () => {
        setDeletePrompt(null);
        router.back();
      },
      onError: (err) =>
        setDeletePrompt({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Pokušaj ponovo.',
        }),
    });
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
      <Stack.Screen
        options={{
          title: recipe.name,
          headerTitle: '',
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/recipes/edit/${recipe.id}`)}
              accessibilityRole="button"
              accessibilityLabel="Uredi recept"
              hitSlop={hit.slop}
              style={styles.headerAction}
            >
              <Text style={styles.editText}>Uredi</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <EmojiBadge emoji={getRecipeEmoji(recipe.name, recipe.emoji)} size={72} />
          <View style={styles.headerText}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{recipe.name}</Text>
              {isCreatedToday(recipe.createdAt) ? <NewBadge /> : null}
            </View>
            <Pressable
              onPress={() => toggleFavorite.mutate(recipe)}
              accessibilityRole="button"
              accessibilityLabel={recipe.isFavorite ? 'Ukloni iz omiljenih' : 'Dodaj u omiljene'}
              hitSlop={hit.slop}
              style={styles.favoriteButton}
            >
              <Text style={styles.favoriteText}>
                {recipe.isFavorite ? '❤️' : '🤍'}
              </Text>
            </Pressable>
          </View>
        </View>

        {recipe.dishType ? <Text style={styles.meta}>{recipe.dishType}</Text> : null}
        {recipe.mealTypes.length > 0 ? (
          <Text style={styles.meta}>{recipe.mealTypes.join(' · ')}</Text>
        ) : null}
        <Text style={styles.meta}>{formatServings(recipe.baseServings)}</Text>
        {recipe.prepTimeMinutes && (
          <Text style={styles.meta}>Vreme pripreme: {recipe.prepTimeMinutes} min</Text>
        )}

        {recipe.description && (
          <Text style={styles.description}>{recipe.description}</Text>
        )}

        <Text style={styles.sectionTitle}>Sastojci</Text>
        {recipe.ingredients.map((item) => {
          const ingredient = ingredientMap.get(item.ingredientId);
          const name = displayIngredientName(item.ingredientName || ingredient?.name || '');
          return (
            <Card key={item.id} tone="bone" style={styles.ingredientCard}>
              <View style={styles.ingredientRow}>
                <Pressable
                  onPress={() => ingredient && editIngredientEmoji(ingredient)}
                  disabled={!ingredient}
                  accessibilityRole="button"
                  accessibilityLabel={`Promeni ikonicu za ${name}`}
                >
                  <EmojiBadge
                    emoji={getIngredientEmoji(
                      name,
                      ingredient?.category,
                      ingredient?.emoji,
                      ingredient?.emojiSource
                    )}
                    size={36}
                    name={name}
                  />
                </Pressable>
                <View style={styles.ingredientBody}>
                  <Text style={styles.ingredientName}>
                    {name || 'Sastojak'}
                  </Text>
                  <Text style={styles.ingredientQuantity}>
                    {formatAmount(item.quantity, item.unit)}
                  </Text>
                  {item.notes && <Text style={styles.note}>{item.notes}</Text>}
                </View>
              </View>
            </Card>
          );
        })}

        {recipe.steps.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Koraci pripreme</Text>
            <Card tone="bone">
              {recipe.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{index + 1}.</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {recipe.notes && (
          <>
            <Text style={styles.sectionTitle}>Napomena</Text>
            <Text style={styles.description}>{recipe.notes}</Text>
          </>
        )}

        <View style={styles.actions}>
          <Button
            title="Dodaj u plan"
            onPress={() => router.push(`/recipes/add-to-plan/${recipe.id}`)}
            variant="secondary"
          />
          <Button
            title="Obriši recept"
            onPress={handleDelete}
            variant="danger"
          />
        </View>
      </ScrollView>
      {ingredientEmojiSheet}
      <ConfirmSheet
        visible={deletePrompt?.kind === 'confirm'}
        title="Obriši recept"
        message={deletePrompt?.message ?? ''}
        confirmLabel="Obriši"
        variant="danger"
        loading={deleteRecipe.isPending}
        onConfirm={confirmDeleteRecipe}
        onCancel={() => setDeletePrompt(null)}
      />
      <ConfirmSheet
        visible={deletePrompt?.kind === 'error'}
        title="Recept nije obrisan"
        message={deletePrompt?.message ?? ''}
        confirmLabel="U redu"
        variant="warning"
        hideCancel
        onConfirm={() => setDeletePrompt(null)}
        onCancel={() => setDeletePrompt(null)}
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
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  favoriteButton: {
    minWidth: hit.min,
    minHeight: hit.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteText: {
    ...typography.h1,
    fontFamily: undefined,
  },
  headerAction: {
    minHeight: hit.min,
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  editText: {
    ...typography.body,
    color: colors.primary,
  },
  meta: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  description: {
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
    color: colors.textOnLight,
  },
  ingredientQuantity: {
    ...typography.body,
    color: colors.textOnLightMuted,
    marginTop: spacing.xs,
  },
  note: {
    ...typography.bodySmall,
    color: colors.textOnLightMuted,
    marginTop: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  stepNumber: {
    ...typography.body,
    color: colors.primary,
    width: layout.stepIndexWidth,
  },
  stepText: {
    ...typography.body,
    color: colors.textOnLight,
    flex: 1,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
});
