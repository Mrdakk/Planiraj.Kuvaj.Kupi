import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
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
import { AppSheet, SheetFooter } from '@/components/ui/AppSheet';
import { EmojiBadge } from '@/components/ui/EmojiBadge';
import { formatAmount } from '@/lib/formatQuantity';
import { displayIngredientName } from '@/lib/ingredientNames';
import { getIngredientEmoji } from '@/constants/emojis';
import { weekScreenSubtitle } from '@/features/planner/service';
import { usePlanWeek } from '@/hooks/usePlanWeek';
import { purchaseCheckedItems } from '@/features/shopping/purchase';
import { checkedShoppingItems } from '@/features/shopping/service';
import { queryKeys } from '@/hooks/queryKeys';
import type { ShoppingItem } from '@/types';

export default function ShoppingScreen() {
  const router = useRouter();
  const { weekStart } = usePlanWeek();
  const { data: list, isLoading: listLoading } = useShoppingList(weekStart);
  const { data: items, isLoading: itemsLoading } = useShoppingItems(list?.id);
  const { data: ingredients } = useIngredients();
  const updateItem = useUpdateShoppingItem();
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = useState(false);
  const [confirmPurchase, setConfirmPurchase] = useState(false);

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

  const checkedItems = useMemo(
    () => checkedShoppingItems(items ?? []),
    [items]
  );
  const checkedCount = checkedItems.length;

  const handlePurchase = async () => {
    if (checkedCount === 0 || purchasing) return;
    setPurchasing(true);
    try {
      await purchaseCheckedItems(checkedItems);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItems(list?.id ?? '') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems }),
        queryClient.invalidateQueries({ queryKey: queryKeys.missing }),
        queryClient.invalidateQueries({ queryKey: queryKeys.ingredients }),
      ]);
      setConfirmPurchase(false);
    } finally {
      setPurchasing(false);
    }
  };

  const isLoading = listLoading || (!!list && itemsLoading);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Kupovina" subtitle={weekScreenSubtitle(weekStart)} />
        <Text style={styles.loading}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Kupovina" subtitle={weekScreenSubtitle(weekStart)} />

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
                    onPress={() => router.push(`/shopping/${item.id}`)}
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
            title={`Kupljeno (${checkedCount})`}
            onPress={() => setConfirmPurchase(true)}
          />
        </View>
      ) : null}

      <FabButton title="+ Dodaj stavku" onPress={() => router.push('/shopping/create')} />

      <AppSheet
        visible={confirmPurchase}
        onClose={() => !purchasing && setConfirmPurchase(false)}
        title="Potvrdi kupovinu"
        subtitle="Ovo ide u kuhinju i skida se sa liste."
        icon="cart-outline"
        footer={
          <SheetFooter
            confirmLabel="Potvrdi kupovinu"
            onConfirm={handlePurchase}
            onCancel={() => setConfirmPurchase(false)}
            loading={purchasing}
            confirmDisabled={purchasing || checkedCount === 0}
          />
        }
      >
        {checkedItems.map((item) => {
          const ingredient = ingredientMap.get(item.ingredientId ?? '');
          const name = displayIngredientName(ingredient?.name ?? item.name);
          return (
            <View key={item.id} style={styles.previewRow}>
              <EmojiBadge
                emoji={getIngredientEmoji(name, ingredient?.category ?? item.category, ingredient?.emoji)}
                name={name}
                size={40}
              />
              <Text style={styles.previewName}>{name}</Text>
              <Text style={styles.previewAmount}>{formatAmount(item.quantity, item.unit)}</Text>
            </View>
          );
        })}
      </AppSheet>
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
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  previewName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  previewAmount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
