import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppSheet } from '@/components/ui/AppSheet';
import { Button } from '@/components/ui/Button';
import { INGREDIENT_EMOJI_OPTIONS } from '@/constants/ingredientEmojis';
import { borderRadius, colors, layout, spacing, typography } from '@/constants/theme';
import { displayIngredientName } from '@/lib/ingredientNames';
import { useUpdateIngredient } from '@/hooks/useIngredients';
import type { Ingredient } from '@/types';

export function IngredientEmojiSheet({
  ingredient,
  onClose,
}: {
  ingredient: Ingredient | null;
  onClose: () => void;
}) {
  const update = useUpdateIngredient();
  const [saving, setSaving] = useState(false);
  const name = ingredient ? displayIngredientName(ingredient.name) : '';

  const choose = (emoji: string | null) => {
    if (!ingredient || saving) return;
    setSaving(true);
    update.mutate(
      {
        ...ingredient,
        emoji,
        emojiSource: emoji ? 'user' : null,
        updatedAt: new Date().toISOString(),
      },
      {
        onSettled: () => {
          setSaving(false);
          onClose();
        },
      }
    );
  };

  return (
    <AppSheet
      visible={ingredient !== null}
      onClose={onClose}
      title="Ikonica namirnice"
      subtitle={name ? `${name}. Izaberi ikonicu ili vrati automatsku.` : undefined}
      icon="happy-outline"
    >
      <View style={styles.grid}>
        {INGREDIENT_EMOJI_OPTIONS.map((option) => {
          const selected = ingredient?.emojiSource === 'user' && ingredient.emoji === option.emoji;
          return (
            <Pressable
              key={option.emoji}
              onPress={() => choose(option.emoji)}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              style={[styles.cell, selected ? styles.cellSelected : null]}
            >
              <Text style={styles.emoji}>{option.emoji}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        title="Vrati automatsku"
        variant="secondary"
        onPress={() => choose(null)}
        disabled={saving}
      />
    </AppSheet>
  );
}

export function useIngredientEmojiEditor() {
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  return {
    editIngredientEmoji: setIngredient,
    ingredientEmojiSheet: (
      <IngredientEmojiSheet ingredient={ingredient} onClose={() => setIngredient(null)} />
    ),
  };
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cell: {
    width: layout.emojiCell,
    height: layout.emojiCell,
    borderRadius: borderRadius.md,
    backgroundColor: colors.sheetField,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  emoji: {
    ...typography.emoji,
  },
});
