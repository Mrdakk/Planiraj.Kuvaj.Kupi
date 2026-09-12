import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
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
import { isCreatedToday } from '@/lib/dates';
import { NewBadge } from '@/components/ui/NewBadge';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, isLoading } = useRecipe(id);
  const { data: ingredients } = useIngredients();
  const deleteRecipe = useDeleteRecipe();
  const toggleFavorite = useToggleFavorite();

  const [confirmDelete, setConfirmDelete] = useState(false);

  const ingredientMap = new Map(ingredients?.map((i) => [i.id, i]) ?? []);

  const handleDelete = () => setConfirmDelete(true);

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: recipe.name,
          headerTitle: '',
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/recipes/edit/${recipe.id}`)}
              style={{ marginRight: spacing.md }}
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
            <Pressable onPress={() => toggleFavorite.mutate(recipe)}>
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
                <EmojiBadge
                  emoji={getIngredientEmoji(
                    name,
                    ingredient?.category,
                    ingredient?.emoji
                  )}
                  size={36}
                  name={name}
                />
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
      <ConfirmSheet
        visible={confirmDelete}
        title="Obriši recept"
        message="Recept se briše iz kuhinje. Ovo se ne može opozvati."
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={() => {
          deleteRecipe.mutate(id, {
            onSuccess: () => router.back(),
          });
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
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
  favoriteText: {
    fontSize: 28,
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
    width: 28,
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
