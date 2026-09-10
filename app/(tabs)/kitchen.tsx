import { useState, useMemo } from 'react';
import { FlatList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { usePantryItems, useUpdatePantryItem } from '@/hooks/usePantryItems';
import { useIngredients } from '@/hooks/useIngredients';
import { ChipRow } from '@/components/ui/ChipRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { FabButton } from '@/components/ui/FabButton';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { expiryLabel } from '@/features/pantry/service';
import { isPresenceInStock, presenceQuantity, tracksPresence } from '@/features/pantry/presence';
import { sortPantryItemsByIngredientName } from '@/features/pantry/sort';
import { formatAmount } from '@/lib/formatQuantity';
import { displayIngredientName, ingredientMatchesSearch } from '@/lib/ingredientNames';
import { getIngredientEmoji } from '@/constants/emojis';
import { ingredientCategories } from '@/constants/categories';

export default function KitchenScreen() {
  const router = useRouter();
  const { data: pantryItems, isLoading } = usePantryItems();
  const { data: ingredients } = useIngredients();
  const updatePantry = useUpdatePantryItem();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const ingredientMap = useMemo(
    () => new Map(ingredients?.map((i) => [i.id, i]) ?? []),
    [ingredients]
  );

  const filteredItems = useMemo(() => {
    let items = pantryItems ?? [];
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      items = items.filter((item) => {
        const ingredient = ingredientMap.get(item.ingredientId);
        return ingredient ? ingredientMatchesSearch(ingredient.name, term) : false;
      });
    }
    if (selectedCategory) {
      items = items.filter((item) => {
        const ingredient = ingredientMap.get(item.ingredientId);
        return ingredient?.category === selectedCategory;
      });
    }
    return sortPantryItemsByIngredientName(items, (ingredientId) => {
      const ingredient = ingredientMap.get(ingredientId);
      return displayIngredientName(ingredient?.name);
    });
  }, [pantryItems, search, selectedCategory, ingredientMap]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Moja kuhinja" />
        <Text style={styles.loading}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Moja kuhinja" />

      <TextInput
        style={styles.search}
        placeholder="Pretraga..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      <ChipRow
        items={ingredientCategories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        allLabel="Svi"
      />

      {filteredItems.length > 0 ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const ingredient = ingredientMap.get(item.ingredientId);
            const name = displayIngredientName(ingredient?.name ?? item.ingredientId);
            const expiry = expiryLabel(item.expiresAt);
            const presence = tracksPresence(ingredient);
            const outOfStock = presence ? !isPresenceInStock(item.quantity) : item.quantity <= 0;
            return (
              <ListRow
                emoji={getIngredientEmoji(name, ingredient?.category, ingredient?.emoji)}
                title={name}
                subtitle={expiry ?? ingredient?.category}
                trailing={presence ? undefined : formatAmount(item.quantity, item.unit)}
                trailingColor={outOfStock ? colors.danger : colors.success}
                trailingNode={
                  presence ? (
                    <Switch
                      value={isPresenceInStock(item.quantity)}
                      onValueChange={(value) =>
                        updatePantry.mutate({
                          ...item,
                          quantity: presenceQuantity(value),
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  ) : undefined
                }
                emptyStock={outOfStock}
                onPress={() => router.push(`/pantry/${item.id}`)}
              />
            );
          }}
        />
      ) : (
        <EmptyState
          title="Još nemaš namirnica"
          message="Dodaj namirnicu ručno ili kroz recept. Nula na stanju je u redu."
          icon="basket-outline"
        />
      )}

      <FabButton
        title="+ Dodaj namirnicu"
        onPress={() =>
          router.push(
            selectedCategory
              ? `/pantry/create?category=${encodeURIComponent(selectedCategory)}`
              : '/pantry/create'
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
  },
  search: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
