import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChipRow } from '@/components/ui/ChipRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import { getRecipeEmoji } from '@/constants/emojis';
import { mealTypes, type MealType } from '@/constants/categories';
import { recipeListSubtitle } from '@/features/recipes/classification';
import { browseRecipes } from '@/features/recipes/search';
import { isCreatedToday } from '@/lib/dates';
import type { Recipe } from '@/types';

export function RecipeBrowseList({
  recipes,
  emptyTitle,
  emptyMessage,
  emptyActionTitle,
  onEmptyAction,
  favoriteOnly,
}: {
  recipes: Recipe[];
  emptyTitle: string;
  emptyMessage: string;
  emptyActionTitle?: string;
  onEmptyAction?: () => void;
  favoriteOnly?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState<MealType | null>(null);
  const source = useMemo(
    () => (favoriteOnly ? recipes.filter((recipe) => recipe.isFavorite) : recipes),
    [favoriteOnly, recipes]
  );
  const visible = useMemo(
    () => browseRecipes(source, search, mealType),
    [source, search, mealType]
  );

  if (source.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionTitle={emptyActionTitle}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <>
      <TextInput
        style={styles.search}
        placeholder="Pretraga..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />
      <ChipRow
        items={mealTypes}
        selected={mealType}
        onSelect={(value) => setMealType(value as MealType | null)}
        allLabel="Sve"
      />
      {visible.length === 0 ? (
        <Text style={styles.empty}>Nema recepta za ovu pretragu.</Text>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ListRow
              emoji={getRecipeEmoji(item.name, item.emoji)}
              title={item.name}
              subtitle={recipeListSubtitle(item)}
              trailing={item.isFavorite ? '❤️' : undefined}
              showNew={isCreatedToday(item.createdAt)}
              onPress={() => router.push(`/recipes/${item.id}`)}
            />
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    ...typography.body,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  list: {
    paddingBottom: 96,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
});
