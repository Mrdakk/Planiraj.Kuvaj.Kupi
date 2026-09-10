import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { useMissingCalculation } from '@/hooks/useMissing';
import { useMeals } from '@/hooks/useMealPlans';
import { useRecipes } from '@/hooks/useRecipes';
import { useMealPlan } from '@/hooks/useMealPlans';
import { useIngredients } from '@/hooks/useIngredients';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppSheet } from '@/components/ui/AppSheet';
import { Button } from '@/components/ui/Button';
import { formatAmount } from '@/lib/formatQuantity';
import { displayIngredientName } from '@/lib/ingredientNames';
import { getIngredientEmoji } from '@/constants/emojis';
import { getWeekStart, formatDayParts } from '@/features/planner/service';
import { groupMissingByDay } from '@/features/missing/groupByDay';
import { partitionMissing } from '@/features/missing/partition';
import {
  allTogetherItemKey,
  byDayItemKey,
  collectAllTogetherLines,
  collectByDayLines,
  keysForDay,
  keysForRecipe,
  selectionHeaderState,
  toggleSelectionKey,
  toggleSelectionKeys,
  type SelectionHeaderState,
} from '@/features/missing/selection';
import { applyAddToShopping, previewAddToShopping } from '@/features/shopping/service';
import type { ShoppingAddLine, ShoppingConflictMode } from '@/features/shopping/types';
import { queryKeys } from '@/hooks/queryKeys';

type ViewMode = 'by-day' | 'all-together';

function HeaderCheck({ state }: { state: SelectionHeaderState }) {
  const name = state === 'all' ? 'checkbox' : state === 'some' ? 'remove' : 'square-outline';
  const color = state === 'none' ? colors.textMuted : colors.primary;
  return <Ionicons name={name} size={20} color={color} />;
}

export default function MissingScreen() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('by-day');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<{ listId: string; lines: ShoppingAddLine[] } | null>(
    null
  );

  const weekStart = getWeekStart(new Date());
  const { data: plan } = useMealPlan(weekStart);
  const { data: meals } = useMeals(plan?.id);
  const { data: recipes } = useRecipes();
  const { data: ingredients } = useIngredients();
  const { data: calculation, isLoading } = useMissingCalculation(weekStart);

  const ingredientMap = useMemo(
    () => new Map(ingredients?.map((i) => [i.id, i]) ?? []),
    [ingredients]
  );

  const missingItems = calculation?.missing ?? [];
  const { presence: presenceMissing, counted: countedMissing } = useMemo(
    () => partitionMissing(missingItems),
    [missingItems]
  );

  const byDay = useMemo(
    () => groupMissingByDay(countedMissing, meals ?? [], recipes ?? []),
    [countedMissing, meals, recipes]
  );

  const selectedCount = selected.size;

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setSelected(new Set());
  };

  const finishAdded = async (listId: string) => {
    setSelected(new Set());
    setConflictVisible(false);
    setPendingAdd(null);
    await queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists });
    await queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItems(listId) });
  };

  const collectLines = () => {
    const presenceLines = collectAllTogetherLines(selected, presenceMissing);
    const rest =
      viewMode === 'by-day'
        ? collectByDayLines(selected, byDay)
        : collectAllTogetherLines(selected, countedMissing);
    return [...presenceLines, ...rest];
  };

  const handleAddToShopping = async () => {
    const lines = collectLines();
    if (lines.length === 0 || adding) return;
    setAdding(true);
    try {
      const preview = await previewAddToShopping(weekStart, lines);
      if (preview.conflicts.length === 0) {
        await applyAddToShopping(preview.list.id, lines, 'merge');
        await finishAdded(preview.list.id);
        return;
      }
      setPendingAdd({ listId: preview.list.id, lines });
      setConflictVisible(true);
    } finally {
      setAdding(false);
    }
  };

  const handleConflictChoice = async (mode: ShoppingConflictMode) => {
    if (!pendingAdd || adding) return;
    setAdding(true);
    try {
      await applyAddToShopping(pendingAdd.listId, pendingAdd.lines, mode);
      await finishAdded(pendingAdd.listId);
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Fali" />
        <Text style={styles.loading}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Fali" />

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => changeViewMode('by-day')}
          style={[styles.toggle, viewMode === 'by-day' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, viewMode === 'by-day' && styles.toggleTextActive]}>
            Po danima
          </Text>
        </Pressable>
        <Pressable
          onPress={() => changeViewMode('all-together')}
          style={[styles.toggle, viewMode === 'all-together' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, viewMode === 'all-together' && styles.toggleTextActive]}>
            Sve zajedno
          </Text>
        </Pressable>
      </View>

      {missingItems.length === 0 ? (
        <EmptyState
          title="Imaš sve što ti treba"
          message="Dodaj obroke da vidiš šta fali."
          icon="checkmark-circle-outline"
        />
      ) : viewMode === 'all-together' ? (
        <FlatList
          data={countedMissing}
          keyExtractor={(item) => item.ingredientId}
          contentContainerStyle={[styles.list, selectedCount > 0 && styles.listWithBar]}
          ListHeaderComponent={
            presenceMissing.length === 0 ? null : (
              <View>
                <Text style={styles.presenceHeader}>Nemaš</Text>
                {presenceMissing.map((item) => {
                  const ingredient = ingredientMap.get(item.ingredientId);
                  const name = displayIngredientName(ingredient?.name ?? item.ingredientName);
                  const key = allTogetherItemKey(item.ingredientId);
                  const checked = selected.has(key);
                  return (
                    <ListRow
                      key={item.ingredientId}
                      emoji={getIngredientEmoji(
                        name,
                        ingredient?.category ?? item.category,
                        ingredient?.emoji
                      )}
                      title={name}
                      subtitle="Nemaš"
                      trailing={
                        item.requiredQuantity > 0
                          ? formatAmount(item.missingQuantity, item.missingUnit)
                          : undefined
                      }
                      trailingColor={colors.danger}
                      emptyStock
                      showCheck
                      checked={checked}
                      onToggleCheck={() => setSelected((current) => toggleSelectionKey(current, key))}
                      onPress={() => setSelected((current) => toggleSelectionKey(current, key))}
                    />
                  );
                })}
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const ingredient = ingredientMap.get(item.ingredientId);
            const name = displayIngredientName(ingredient?.name ?? item.ingredientName);
            const key = allTogetherItemKey(item.ingredientId);
            const checked = selected.has(key);
            return (
              <ListRow
                emoji={getIngredientEmoji(name, ingredient?.category ?? item.category, ingredient?.emoji)}
                title={name}
                subtitle={`Imaš ${formatAmount(item.availableQuantity, item.availableUnit)}`}
                trailing={formatAmount(item.missingQuantity, item.missingUnit)}
                trailingColor={colors.danger}
                showCheck
                checked={checked}
                onToggleCheck={() => setSelected((current) => toggleSelectionKey(current, key))}
                onPress={() => setSelected((current) => toggleSelectionKey(current, key))}
              />
            );
          }}
        />
      ) : (
        <FlatList
          data={byDay}
          keyExtractor={(group) => group.date}
          contentContainerStyle={[styles.list, selectedCount > 0 && styles.listWithBar]}
          ListHeaderComponent={
            presenceMissing.length === 0 ? null : (
              <View>
                <Text style={styles.presenceHeader}>Nemaš</Text>
                {presenceMissing.map((item) => {
                  const ingredient = ingredientMap.get(item.ingredientId);
                  const name = displayIngredientName(ingredient?.name ?? item.ingredientName);
                  const key = allTogetherItemKey(item.ingredientId);
                  const checked = selected.has(key);
                  return (
                    <ListRow
                      key={item.ingredientId}
                      emoji={getIngredientEmoji(
                        name,
                        ingredient?.category ?? item.category,
                        ingredient?.emoji
                      )}
                      title={name}
                      subtitle="Nemaš"
                      trailing={
                        item.requiredQuantity > 0
                          ? formatAmount(item.missingQuantity, item.missingUnit)
                          : undefined
                      }
                      trailingColor={colors.danger}
                      emptyStock
                      showCheck
                      checked={checked}
                      onToggleCheck={() => setSelected((current) => toggleSelectionKey(current, key))}
                      onPress={() => setSelected((current) => toggleSelectionKey(current, key))}
                    />
                  );
                })}
              </View>
            )
          }
          renderItem={({ item: group }) => {
            const parts = formatDayParts(group.date);
            const dayKeys = keysForDay(group);
            const dayState = selectionHeaderState(selected, dayKeys);
            return (
              <View>
                <Pressable
                  onPress={() => setSelected((current) => toggleSelectionKeys(current, dayKeys))}
                  style={({ pressed }) => [styles.groupHeader, pressed && styles.headerPressed]}
                >
                  <HeaderCheck state={dayState} />
                  <Text style={styles.dayHeader}>
                    {parts.day} {parts.date}
                  </Text>
                </Pressable>
                {group.recipes.map((recipeGroup) => {
                  const recipeKeys = keysForRecipe(group.date, recipeGroup);
                  const recipeState = selectionHeaderState(selected, recipeKeys);
                  return (
                    <View key={recipeGroup.recipeId}>
                      <Pressable
                        onPress={() =>
                          setSelected((current) => toggleSelectionKeys(current, recipeKeys))
                        }
                        style={({ pressed }) => [styles.groupHeader, pressed && styles.headerPressed]}
                      >
                        <HeaderCheck state={recipeState} />
                        <Text style={styles.mealHeader}>
                          {recipeGroup.mealCount > 1
                            ? `${recipeGroup.recipeName} ×${recipeGroup.mealCount}`
                            : recipeGroup.recipeName}
                        </Text>
                      </Pressable>
                      {recipeGroup.items.map((item) => {
                        const ingredient = ingredientMap.get(item.ingredientId);
                        const name = displayIngredientName(ingredient?.name ?? item.ingredientName);
                        const key = byDayItemKey(group.date, recipeGroup.recipeId, item.ingredientId);
                        const checked = selected.has(key);
                        return (
                          <ListRow
                            key={key}
                            emoji={getIngredientEmoji(
                              name,
                              ingredient?.category ?? item.category,
                              ingredient?.emoji
                            )}
                            title={name}
                            trailing={formatAmount(item.quantity, item.unit)}
                            trailingColor={colors.danger}
                            showCheck
                            checked={checked}
                            onToggleCheck={() =>
                              setSelected((current) => toggleSelectionKey(current, key))
                            }
                            onPress={() =>
                              setSelected((current) => toggleSelectionKey(current, key))
                            }
                          />
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            );
          }}
        />
      )}

      {selectedCount > 0 ? (
        <View style={styles.barWrap} pointerEvents="box-none">
          <Pressable
            onPress={handleAddToShopping}
            disabled={adding}
            style={({ pressed }) => [styles.bar, (pressed || adding) && styles.barPressed]}
          >
            <Text style={styles.barText}>
              {adding ? 'Učitavanje...' : `Dodaj na kupovinu (${selectedCount})`}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <AppSheet
        visible={conflictVisible}
        onClose={() => {
          if (adding) return;
          setConflictVisible(false);
          setPendingAdd(null);
        }}
        title="Već je na listi"
        subtitle="Neke namirnice već postoje na kupovini. Saberi količine ili dodaj kao nove stavke."
        icon="cart-outline"
        footer={
          <View style={styles.conflictActions}>
            <Button
              title="Saberi količine"
              onPress={() => handleConflictChoice('merge')}
              loading={adding}
            />
            <Button
              title="Dodaj kao nove"
              variant="secondary"
              onPress={() => handleConflictChoice('separate')}
              loading={adding}
            />
          </View>
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
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  toggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  toggleTextActive: {
    color: '#fff',
  },
  list: {
    paddingBottom: spacing.xxxl,
  },
  listWithBar: {
    paddingBottom: 96,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerPressed: {
    opacity: 0.7,
  },
  dayHeader: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.6,
    flex: 1,
  },
  mealHeader: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  presenceHeader: {
    ...typography.caption,
    color: colors.danger,
    letterSpacing: 0.6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontWeight: '700',
  },
  barWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  barPressed: {
    opacity: 0.85,
  },
  barText: {
    ...typography.button,
    color: '#fff',
  },
  conflictActions: {
    gap: spacing.sm,
  },
});
