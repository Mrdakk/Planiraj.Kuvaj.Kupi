import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppSheet } from '@/components/ui/AppSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import { getIngredientEmoji } from '@/constants/emojis';
import { displayIngredientName, ingredientMatchesSearch } from '@/lib/ingredientNames';
import type { Ingredient } from '@/types';

export function IngredientPickerSheet({
  visible,
  onClose,
  ingredients,
  excludeIds = [],
  absorbName,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  excludeIds?: string[];
  absorbName: string;
  onConfirm: (keep: Ingredient) => void;
}) {
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Ingredient | null>(null);

  const excluded = useMemo(() => new Set(excludeIds.filter(Boolean)), [excludeIds]);
  const absorbLabel = displayIngredientName(absorbName);

  const options = useMemo(() => {
    return ingredients
      .filter((row) => !excluded.has(row.id))
      .filter((row) => ingredientMatchesSearch(row.name, search))
      .sort((a, b) =>
        displayIngredientName(a.name).localeCompare(displayIngredientName(b.name), 'sr', {
          sensitivity: 'base',
        })
      );
  }, [excluded, ingredients, search]);

  const close = () => {
    setSearch('');
    setPending(null);
    onClose();
  };

  const keepName = pending ? displayIngredientName(pending.name) : '';

  return (
    <>
      <AppSheet
        visible={visible && pending === null}
        onClose={close}
        title="Poveži namirnice"
        subtitle="Izaberi namirnicu koja ostaje. Ova iz recepta će nestati."
        icon="git-merge-outline"
        scrollable={false}
      >
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Traži namirnicu..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        {options.length === 0 ? (
          <Text style={styles.empty}>Nema namirnice za ovu pretragu.</Text>
        ) : (
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {options.map((other) => {
              const otherName = displayIngredientName(other.name);
              return (
                <View key={other.id} style={styles.row}>
                  <ListRow
                    emoji={getIngredientEmoji(otherName, other.category, other.emoji, other.emojiSource)}
                    title={otherName}
                    subtitle={other.category}
                    onPress={() => setPending(other)}
                    plain
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </AppSheet>
      <ConfirmSheet
        visible={pending !== null}
        title="Poveži namirnice"
        message={`${absorbLabel} nestaje. Recepti će koristiti ${keepName}.`}
        confirmLabel="Poveži"
        variant="warning"
        onConfirm={() => {
          if (!pending) return;
          const keep = pending;
          setPending(null);
          setSearch('');
          onClose();
          onConfirm(keep);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
