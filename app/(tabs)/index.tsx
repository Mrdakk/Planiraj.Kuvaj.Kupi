import { useState, useMemo, useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borderRadius, colors, shadows, spacing, typography } from '@/constants/theme';
import { useMealPlan, useMeals } from '@/hooks/useMealPlans';
import { useRecipes } from '@/hooks/useRecipes';
import { ChipRow } from '@/components/ui/ChipRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { FabButton } from '@/components/ui/FabButton';
import { Button } from '@/components/ui/Button';
import { EmojiBadge } from '@/components/ui/EmojiBadge';
import { NewBadge } from '@/components/ui/NewBadge';
import { getRecipeEmoji } from '@/constants/emojis';
import { isCreatedToday, todayISO, dateKey } from '@/lib/dates';
import { formatServings } from '@/lib/formatServings';
import {
  getWeekDates,
  weekDayChipLabel,
  defaultDayForWeek,
  compareMealsByPlanOrder,
  formatWeekNavRange,
  formatWeekRange,
  isPastDay,
} from '@/features/planner/service';
import { usePlanWeek } from '@/hooks/usePlanWeek';
import { SuggestMealSheet } from '@/features/planner/SuggestMealSheet';
import { mealSurface, mealSurfacePressed } from '@/features/planner/mealStatus';
import type { Meal, Recipe } from '@/types';
import type { MealType } from '@/constants/categories';

export default function PlanScreen() {
  const router = useRouter();
  const { weekStart, isThisWeek, goPreviousWeek, goNextWeek, goThisWeek } = usePlanWeek();
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const { data: plan, isLoading: planLoading } = useMealPlan(weekStart);
  const { data: meals, isLoading: mealsLoading } = useMeals(plan?.id);
  const { data: recipes } = useRecipes();
  const isLoading = planLoading || (!!plan && mealsLoading);

  useEffect(() => {
    setSelectedDate(defaultDayForWeek(weekStart));
  }, [weekStart]);

  const recipeMap = useMemo(
    () => new Map(recipes?.map((r) => [r.id, r]) ?? []),
    [recipes]
  );

  const mealGroups = useMemo(() => {
    const dayMeals = [...(meals ?? [])]
      .filter((m) => dateKey(m.date) === selectedDate)
      .sort(compareMealsByPlanOrder);
    const groups: { type: MealType; meals: Meal[] }[] = [];
    for (const meal of dayMeals) {
      const last = groups[groups.length - 1];
      if (last?.type === meal.mealType) last.meals.push(meal);
      else groups.push({ type: meal.mealType, meals: [meal] });
    }
    return groups;
  }, [meals, selectedDate]);

  const goToThisWeek = () => {
    goThisWeek();
    setSelectedDate(todayISO());
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WeekHeader
        weekStart={weekStart}
        isThisWeek={isThisWeek}
        onPrev={goPreviousWeek}
        onNext={goNextWeek}
        onToday={goToThisWeek}
      />

      <ChipRow
        items={weekDates}
        selected={selectedDate}
        onSelect={(item) => {
          if (item) setSelectedDate(item);
        }}
        allowDeselect={false}
        compact
        labelFor={weekDayChipLabel}
        isMuted={isPastDay}
      />

      {isLoading ? (
        <Text style={styles.loading}>Učitavanje...</Text>
      ) : mealGroups.length > 0 ? (
        <FlatList
          data={mealGroups}
          keyExtractor={(item) => item.type}
          contentContainerStyle={styles.list}
          style={styles.listFill}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MealTypeGroup
              type={item.type}
              meals={item.meals}
              recipeMap={recipeMap}
              onOpenMeal={(id) => router.push(`/meals/${id}`)}
            />
          )}
        />
      ) : (
        <EmptyState
          title="Nema obroka za ovaj dan"
          message="Dodaj obrok za izabrani dan."
          icon="restaurant-outline"
        />
      )}

      <FabButton title="+ Dodaj obrok" onPress={() => router.push('/meals/create')}>
        <Button
          title="Predloži obrok"
          variant="ghost"
          onPress={() => setSuggestOpen(true)}
          style={styles.suggestButton}
        />
      </FabButton>
      <SuggestMealSheet
        visible={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        defaultDate={isPastDay(selectedDate) ? todayISO() : selectedDate}
        weekMeals={meals ?? []}
        onPick={({ recipeId, date, mealType }) => {
          setSuggestOpen(false);
          router.push({
            pathname: '/meals/create',
            params: { recipeId, date, mealType },
          });
        }}
      />
    </SafeAreaView>
  );
}

function MealTypeGroup({
  type,
  meals,
  recipeMap,
  onOpenMeal,
}: {
  type: MealType;
  meals: Meal[];
  recipeMap: Map<string, Recipe>;
  onOpenMeal: (id: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{type}</Text>
      {meals.map((meal) => {
        const recipe = recipeMap.get(meal.recipeId);
        const name = recipe?.name ?? 'Recept';
        return (
          <Pressable
            key={meal.id}
            onPress={() => onOpenMeal(meal.id)}
            style={({ pressed }) => [
              styles.mealCard,
              { backgroundColor: pressed ? mealSurfacePressed(meal.isCooked) : mealSurface(meal.isCooked) },
            ]}
          >
            <View style={styles.mealBody}>
              <View style={styles.mealTitleRow}>
                <Text style={styles.mealTitle} numberOfLines={2}>
                  {name}
                </Text>
                {isCreatedToday(recipe?.createdAt) ? <NewBadge /> : null}
              </View>
              <Text style={styles.mealMeta}>{formatServings(meal.servings)}</Text>
            </View>
            <EmojiBadge
              emoji={getRecipeEmoji(name, recipe?.emoji)}
              size={72}
              name={name}
              shape="rounded"
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function WeekHeader({
  weekStart,
  isThisWeek,
  onPrev,
  onNext,
  onToday,
}: {
  weekStart: string;
  isThisWeek: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Nedelja</Text>
      <View style={styles.weekNav}>
        <View style={styles.weekRange}>
          <Pressable
            onPress={onPrev}
            hitSlop={8}
            accessibilityLabel="Prethodna nedelja"
            style={({ pressed }) => [styles.weekNavArrow, pressed && styles.weekNavArrowPressed]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.weekNavTitle}>{formatWeekNavRange(weekStart)}</Text>
          <Pressable
            onPress={onNext}
            hitSlop={8}
            accessibilityLabel="Sledeća nedelja"
            style={({ pressed }) => [styles.weekNavArrow, pressed && styles.weekNavArrowPressed]}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <Pressable
          onPress={onToday}
          disabled={isThisWeek}
          accessibilityLabel={isThisWeek ? 'Ova nedelja' : 'Nazad na ovu nedelju'}
          accessibilityHint={formatWeekRange(weekStart)}
          style={[styles.thisWeekPill, !isThisWeek && styles.thisWeekPillAction]}
        >
          <Text style={[styles.thisWeekPillText, !isThisWeek && styles.thisWeekPillTextAction]}>
            Ova nedelja
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  weekRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
  },
  weekNavArrow: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavArrowPressed: {
    opacity: 0.7,
  },
  weekNavTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  thisWeekPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  thisWeekPillAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  thisWeekPillText: {
    ...typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  thisWeekPillTextAction: {
    color: colors.primary,
  },
  loading: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
  },
  listFill: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 168,
  },
  group: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: 112,
    gap: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  mealBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealTitle: {
    ...typography.displayTitle,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  mealMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  suggestButton: {
    alignSelf: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
});
