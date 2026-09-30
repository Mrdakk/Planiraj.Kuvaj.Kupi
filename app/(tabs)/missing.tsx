import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { useMissingCalculation } from '@/hooks/useMissing';
import { useMeals, useMealPlan } from '@/hooks/useMealPlans';
import { useRecipes } from '@/hooks/useRecipes';
import { useIngredients } from '@/hooks/useIngredients';
import { useShoppingItems, useShoppingList } from '@/hooks/useShoppingList';
import { invalidateAfterShoppingChange } from '@/hooks/invalidate';
import { usePlanWeek } from '@/hooks/usePlanWeek';
import { EmptyState } from '@/components/ui/EmptyState';
import { emptyCta } from '@/components/ui/emptyCta';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { AppSheet } from '@/components/ui/AppSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Button } from '@/components/ui/Button';
import { FabButton } from '@/components/ui/FabButton';
import { formatAmount } from '@/lib/formatQuantity';
import { displayIngredientName } from '@/lib/ingredientNames';
import { getIngredientEmoji } from '@/constants/emojis';
import { useIngredientEmojiEditor } from '@/features/ingredients/IngredientEmojiSheet';
import type { Unit } from '@/constants/units';
import type { Ingredient } from '@/types';
import type { CalculationResult } from '@/calculations/engine';
import { formatDayParts, weekScreenSubtitle } from '@/features/planner/service';
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
import {
  applyAddToShopping,
  previewAddToShopping,
  shoppingMatchKey,
} from '@/features/shopping/service';
import type { ShoppingAddLine, ShoppingConflictMode } from '@/features/shopping/types';

type ViewMode = 'by-day' | 'all-together';

const VIEW_OPTIONS = [
  { value: 'by-day', label: 'Po danima' },
  { value: 'all-together', label: 'Sve zajedno' },
] as const;

const VIEW_HINTS: Record<ViewMode, string> = {
  'by-day': 'Šta fali za svaki obrok. Zalihe prvo pokrivaju najranije dane.',
  'all-together': 'Ukupno za celu nedelju, umanjeno za ono što imaš.',
};

function HeaderCheck({ state }: { state: SelectionHeaderState }) {
  const name = state === 'all' ? 'checkbox' : state === 'some' ? 'remove' : 'square-outline';
  const color = state === 'none' ? colors.textMuted : colors.primary;
  return <Ionicons name={name} size={20} color={color} />;
}

export default function MissingScreen() {
  const { editIngredientEmoji, ingredientEmojiSheet } = useIngredientEmojiEditor();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('by-day');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<{ listId: string; lines: ShoppingAddLine[] } | null>(
    null
  );

  const { weekStart } = usePlanWeek();
  const { data: plan } = useMealPlan(weekStart);
  const { data: meals } = useMeals(plan?.id);
  const { data: recipes } = useRecipes();
  const { data: ingredients } = useIngredients();
  const { data: calculation, isLoading } = useMissingCalculation(weekStart);
  const { data: shoppingList } = useShoppingList(weekStart);
  const { data: shoppingItems } = useShoppingItems(shoppingList?.id);

  const ingredientMap = useMemo(
    () => new Map(ingredients?.map((i) => [i.id, i]) ?? []),
    [ingredients]
  );

  const onShoppingList = useMemo(
    () =>
      new Set(
        (shoppingItems ?? []).flatMap((item) =>
          item.ingredientId ? [shoppingMatchKey(item.ingredientId, item.unit)] : []
        )
      ),
    [shoppingItems]
  );
  const isOnList = (ingredientId: string, unit: Unit) =>
    onShoppingList.has(shoppingMatchKey(ingredientId, unit));

  const missingItems = useMemo(() => calculation?.missing ?? [], [calculation]);
  const { presence: presenceMissing, counted: countedMissing } = useMemo(
    () => partitionMissing(missingItems),
    [missingItems]
  );

  const byDay = useMemo(
    () => groupMissingByDay(countedMissing, meals ?? [], recipes ?? []),
    [countedMissing, meals, recipes]
  );

  const selectedCount = selected.size;
  const toggle = (key: string) => setSelected((current) => toggleSelectionKey(current, key));

  useEffect(() => {
    setSelected(new Set());
  }, [weekStart]);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setSelected(new Set());
  };

  const finishAdded = async () => {
    setSelected(new Set());
    setConflictVisible(false);
    setPendingAdd(null);
    await invalidateAfterShoppingChange(queryClient);
  };

  const failAdd = (err: unknown) => {
    setConflictVisible(false);
    setPendingAdd(null);
    setAddError(err instanceof Error ? err.message : 'Pokušaj ponovo.');
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
        await finishAdded();
        return;
      }
      setPendingAdd({ listId: preview.list.id, lines });
      setConflictVisible(true);
    } catch (err) {
      failAdd(err);
    } finally {
      setAdding(false);
    }
  };

  const handleConflictChoice = async (mode: ShoppingConflictMode) => {
    if (!pendingAdd || adding) return;
    setAdding(true);
    try {
      await applyAddToShopping(pendingAdd.listId, pendingAdd.lines, mode);
      await finishAdded();
    } catch (err) {
      failAdd(err);
    } finally {
      setAdding(false);
    }
  };

  const header = (
    <>
      <ScreenHeader title="Fali" subtitle={weekScreenSubtitle(weekStart)} />
      <View style={styles.viewToggle}>
        <SegmentedControl options={VIEW_OPTIONS} value={viewMode} onChange={changeViewMode} />
        <Text style={styles.viewHint}>{VIEW_HINTS[viewMode]}</Text>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <Text style={styles.loading}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  const presenceSection =
    presenceMissing.length === 0 ? null : (
      <View>
        <Text style={styles.presenceHeader}>Nemaš</Text>
        {presenceMissing.map((item) => (
          <MissingRow
            key={item.key}
            item={item}
            ingredient={ingredientMap.get(item.ingredientId)}
            subtitle={isOnList(item.ingredientId, item.missingUnit) ? 'Nemaš · već na listi' : 'Nemaš'}
            trailing={
              item.requiredQuantity > 0 ? formatAmount(item.missingQuantity, item.missingUnit) : undefined
            }
            emptyStock
            checked={selected.has(allTogetherItemKey(item.key))}
            onToggle={() => toggle(allTogetherItemKey(item.key))}
            onEmojiPress={() => {
              const ingredient = ingredientMap.get(item.ingredientId);
              if (ingredient) editIngredientEmoji(ingredient);
            }}
          />
        ))}
      </View>
    );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}

      {missingItems.length === 0 ? (
        <EmptyState
          title="Imaš sve što ti treba"
          message="Kad dodaš obroke u plan, ovde vidiš šta treba kupiti."
          icon="checkmark-circle-outline"
          actionTitle={emptyCta.missing.title}
          onAction={() => router.push(emptyCta.missing.href)}
        />
      ) : viewMode === 'all-together' ? (
        <FlatList
          data={countedMissing}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[styles.list, selectedCount > 0 && styles.listWithBar]}
          ListHeaderComponent={presenceSection}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <MissingRow
              item={item}
              ingredient={ingredientMap.get(item.ingredientId)}
              subtitle={
                `Imaš ${formatAmount(item.availableQuantity, item.availableUnit)}` +
                (isOnList(item.ingredientId, item.missingUnit) ? ' · već na listi' : '')
              }
              trailing={formatAmount(item.missingQuantity, item.missingUnit)}
              checked={selected.has(allTogetherItemKey(item.key))}
              onToggle={() => toggle(allTogetherItemKey(item.key))}
              onEmojiPress={() => {
                const ingredient = ingredientMap.get(item.ingredientId);
                if (ingredient) editIngredientEmoji(ingredient);
              }}
            />
          )}
        />
      ) : (
        <FlatList
          data={byDay}
          keyExtractor={(group) => group.date}
          contentContainerStyle={[styles.list, selectedCount > 0 && styles.listWithBar]}
          ListHeaderComponent={presenceSection}
          renderItem={({ item: group }) => {
            const parts = formatDayParts(group.date);
            const dayKeys = keysForDay(group);
            return (
              <View>
                <Pressable
                  onPress={() => setSelected((current) => toggleSelectionKeys(current, dayKeys))}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Izaberi sve za ${parts.day} ${parts.date}`}
                  style={({ pressed }) => [styles.groupHeader, pressed && styles.headerPressed]}
                >
                  <HeaderCheck state={selectionHeaderState(selected, dayKeys)} />
                  <Text style={styles.dayHeader}>
                    {parts.day} {parts.date}
                  </Text>
                </Pressable>
                {group.recipes.map((recipeGroup) => {
                  const recipeKeys = keysForRecipe(group.date, recipeGroup);
                  return (
                    <View key={recipeGroup.recipeId}>
                      <Pressable
                        onPress={() =>
                          setSelected((current) => toggleSelectionKeys(current, recipeKeys))
                        }
                        accessibilityRole="checkbox"
                        accessibilityLabel={`Izaberi sve za ${recipeGroup.recipeName}`}
                        style={({ pressed }) => [styles.groupHeader, pressed && styles.headerPressed]}
                      >
                        <HeaderCheck state={selectionHeaderState(selected, recipeKeys)} />
                        <Text style={styles.mealHeader}>
                          {recipeGroup.mealCount > 1
                            ? `${recipeGroup.recipeName} ×${recipeGroup.mealCount}`
                            : recipeGroup.recipeName}
                        </Text>
                      </Pressable>
                      {recipeGroup.items.map((item) => {
                        const key = byDayItemKey(group.date, recipeGroup.recipeId, item.key);
                        return (
                          <MissingRow
                            key={key}
                            item={item}
                            ingredient={ingredientMap.get(item.ingredientId)}
                            subtitle={isOnList(item.ingredientId, item.unit) ? 'Već na listi' : undefined}
                            trailing={formatAmount(item.quantity, item.unit)}
                            checked={selected.has(key)}
                            onToggle={() => toggle(key)}
                            onEmojiPress={() => {
                              const ingredient = ingredientMap.get(item.ingredientId);
                              if (ingredient) editIngredientEmoji(ingredient);
                            }}
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
        <FabButton
          title={`Dodaj na kupovinu (${selectedCount})`}
          onPress={handleAddToShopping}
          loading={adding}
        />
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

      {ingredientEmojiSheet}

      <ConfirmSheet
        visible={addError !== null}
        title="Nije dodato na kupovinu"
        message={addError ?? ''}
        confirmLabel="U redu"
        variant="warning"
        hideCancel
        onConfirm={() => setAddError(null)}
        onCancel={() => setAddError(null)}
      />
    </SafeAreaView>
  );
}

function MissingRow({
  item,
  ingredient,
  subtitle,
  trailing,
  emptyStock,
  checked,
  onToggle,
  onEmojiPress,
}: {
  item: Pick<CalculationResult, 'ingredientName' | 'category'>;
  ingredient: Ingredient | undefined;
  subtitle?: string;
  trailing?: string;
  emptyStock?: boolean;
  checked: boolean;
  onToggle: () => void;
  onEmojiPress?: () => void;
}) {
  const name = displayIngredientName(ingredient?.name ?? item.ingredientName);
  return (
    <ListRow
      emoji={getIngredientEmoji(
        name,
        ingredient?.category ?? item.category,
        ingredient?.emoji,
        ingredient?.emojiSource
      )}
      title={name}
      subtitle={subtitle}
      trailing={trailing}
      trailingColor={colors.danger}
      emptyStock={emptyStock}
      showCheck
      checked={checked}
      onToggleCheck={onToggle}
      onPress={onToggle}
      onEmojiPress={onEmojiPress}
    />
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
  viewToggle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  viewHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  list: {
    paddingBottom: spacing.xxxl,
  },
  listWithBar: {
    paddingBottom: layout.fabClearance,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: layout.listInset,
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
  conflictActions: {
    gap: spacing.sm,
  },
});
