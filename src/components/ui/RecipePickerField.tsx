import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppSheet } from '@/components/ui/AppSheet';
import { ListRow } from '@/components/ui/ListRow';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import { getRecipeEmoji } from '@/constants/emojis';
import { recipeListSubtitle } from '@/features/recipes/classification';
import { filterRecipes } from '@/features/recipes/search';
import type { Recipe } from '@/types';

export function RecipePickerField({
  label = 'Recept',
  value,
  recipes,
  onChange,
  placeholder = 'Izaberi recept',
  disabled = false,
}: {
  label?: string;
  value: string;
  recipes: Recipe[];
  onChange: (recipeId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = recipes.find((recipe) => recipe.id === value);
  const filtered = useMemo(() => filterRecipes(recipes, query), [recipes, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[styles.field, disabled && styles.fieldDisabled]}
        accessibilityRole="button"
        accessibilityLabel={selected ? `${label}: ${selected.name}` : placeholder}
      >
        {selected ? (
          <Text style={styles.emoji}>{getRecipeEmoji(selected.name, selected.emoji)}</Text>
        ) : (
          <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
        )}
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.name ?? placeholder}
        </Text>
        {disabled ? null : <Ionicons name="chevron-down" size={18} color={colors.textMuted} />}
      </Pressable>

      <AppSheet
        visible={open}
        onClose={close}
        title="Izaberi recept"
        icon="restaurant-outline"
        scrollable={false}
      >
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Traži recept..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>Nema recepta za ovu pretragu.</Text>
        ) : (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((recipe) => {
              const isSelected = recipe.id === value;
              return (
                <View key={recipe.id} style={styles.row}>
                  <ListRow
                    emoji={getRecipeEmoji(recipe.name, recipe.emoji)}
                    title={recipe.name}
                    subtitle={recipeListSubtitle(recipe)}
                    trailing={isSelected ? '✓' : undefined}
                    trailingColor={colors.primary}
                    highlighted={isSelected}
                    plain
                    onPress={() => {
                      onChange(recipe.id);
                      close();
                    }}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </AppSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  emoji: {
    ...typography.emojiSmall,
  },
  value: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textMuted,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sheetField,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    marginBottom: spacing.sm,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
