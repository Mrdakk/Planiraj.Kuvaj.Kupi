import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/constants/theme';
import {
  useShoppingList,
  useShoppingItems,
  useUpdateShoppingItem,
} from '@/hooks/useShoppingList';
import { useIngredients } from '@/hooks/useIngredients';
import { EmptyState } from '@/components/ui/EmptyState';
import { FabButton } from '@/components/ui/FabButton';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { formatAmount } from '@/lib/formatQuantity';
import { displayIngredientName } from '@/lib/ingredientNames';
import { getIngredientEmoji } from '@/constants/emojis';
import { getWeekStart } from '@/features/planner/service';
import { purchaseCheckedItems } from '@/features/shopping/purchase';
import { queryKeys } from '@/hooks/queryKeys';
import type { ShoppingItem } from '@/types';

export default function ShoppingScreen() {
  const router = useRouter();
  const weekStart = getWeekStart(new Date());
  const { data: list, isLoading: listLoading } = useShoppingList(weekStart);
  const { data: items, isLoading: itemsLoading } = useShoppingItems(list?.id);
  const { data: ingredients } = useIngredients();
  const updateItem = useUpdateShoppingItem();
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = useState(false);

  const ingredientMap = useMemo(
    () => new Map(ingredients?.map((i) => [i.id, i]) ?? []),
    [ingredients]
  );

  const groupedItems = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items ?? []) {
      const listForCategory = map.get(item.category) ?? [];
      listForCategory.push(item);
      map.set(item.category, listForCategory);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, categoryItems]) => ({ category, items: categoryItems }));
  }, [items]);

  const handleToggle = (item: ShoppingItem) => {
    updateItem.mutate({
      ...item,
      isChecked: !item.isChecked,
      updatedAt: new Date().toISOString(),
    });
  };

  const checkedCount = useMemo(
    () => (items ?? []).filter((item) => item.isChecked).length,
    [items]
  );

  const handlePurchase = async () => {
    if (!items || checkedCount === 0 || purchasing) return;
    setPurchasing(true);
    try {
      await purchaseCheckedItems(items);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItems(list?.id ?? '') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems }),
        queryClient.invalidateQueries({ queryKey: queryKeys.missing }),
        queryClient.invalidateQueries({ queryKey: queryKeys.ingredients }),
      ]);
    } finally {
      setPurchasing(false);
    }
  };

  const isLoading = listLoading || (!!list && itemsLoading);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Kupovina" />
        <Text style={styles.loading}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Kupovina" />

      {groupedItems.length === 0 ? (
        <EmptyState
          title="Lista je prazna"
          message="Sa taba Fali označi šta da kupiš, ili dodaj ručno."
          icon="cart-outline"
        />
      ) : (
        <FlatList
          data={groupedItems}
          keyExtractor={(section) => section.category}
          contentContainerStyle={[styles.list, checkedCount > 0 && styles.listWithBar]}
          renderItem={({ item: section }) => (
            <View>
              <Text style={styles.sectionTitle}>{section.category.toUpperCase()}</Text>
              {section.items.map((item) => {
                const ingredient = ingredientMap.get(item.ingredientId ?? '');
                const name = displayIngredientName(ingredient?.name ?? item.name);
                return (
                  <ListRow
                    key={item.id}
                    emoji={getIngredientEmoji(name, ingredient?.category ?? item.category, ingredient?.emoji)}
                    title={name}
                    trailing={formatAmount(item.quantity, item.unit)}
                    showCheck
                    checked={item.isChecked}
                    onToggleCheck={() => handleToggle(item)}
                    onPress={() => handleToggle(item)}
                  />
                );
              })}
            </View>
          )}
        />
      )}

      {checkedCount > 0 ? (
        <View style={styles.barWrap}>
          <Button
            title={purchasing ? 'Učitavanje...' : `Kupljeno (${checkedCount})`}
            onPress={handlePurchase}
            loading={purchasing}
            disabled={purchasing}
          />
        </View>
      ) : null}

      <FabButton title="+ Dodaj stavku" onPress={() => router.push('/shopping/create')} />
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
  list: {
    paddingBottom: 96,
  },
  listWithBar: {
    paddingBottom: 160,
  },
  barWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 76,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
