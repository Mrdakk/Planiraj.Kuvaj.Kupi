import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipRow } from '@/components/ui/ChipRow';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmojiBadge } from '@/components/ui/EmojiBadge';
import { Input } from '@/components/ui/Input';
import { AppSheet, SheetFooter } from '@/components/ui/AppSheet';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { getIngredientEmoji, getRecipeEmoji } from '@/constants/emojis';
import { useMeal } from '@/hooks/useMealPlans';
import { useRecipe } from '@/hooks/useRecipes';
import { useIngredients } from '@/hooks/useIngredients';
import { copyMeal, moveMeal, deleteMeal, canDeleteMeal, isPastDay } from '@/features/planner/service';
import { consumeMeal, buildConsumptionPreview, unconsumeMeal } from '@/features/cooking/service';
import { buildMealCookView } from '@/features/cooking/cookView';
import type { ConsumptionPreviewItem } from '@/features/cooking/service';
import { formatAmount, formatQuantity, parseQuantity } from '@/lib/formatQuantity';
import { formatServings } from '@/lib/formatServings';
import { displayIngredientName } from '@/lib/ingredientNames';
import { formatDisplayDate, isCreatedToday, todayISO } from '@/lib/dates';
import { NewBadge } from '@/components/ui/NewBadge';
import { queryKeys } from '@/hooks/queryKeys';
import { mealTypes, type MealType } from '@/constants/categories';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: meal, isLoading } = useMeal(id);
  const { data: recipe, isLoading: recipeLoading } = useRecipe(meal?.recipeId ?? '');
  const { data: ingredients } = useIngredients();

  const [preview, setPreview] = useState<ConsumptionPreviewItem[] | null>(null);
  const [pendingPresence, setPendingPresence] = useState<ConsumptionPreviewItem[]>([]);
  const [presenceChecks, setPresenceChecks] = useState<
    { ingredientId: string; ingredientName: string; stillHave: boolean }[] | null
  >(null);
  const countedOverrides = useRef(new Map<string, number>());
  const [partialItem, setPartialItem] = useState<ConsumptionPreviewItem | null>(null);
  const [partialQuantity, setPartialQuantity] = useState('');
  const [relocateMode, setRelocateMode] = useState<'copy' | 'move' | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [targetMealType, setTargetMealType] = useState<MealType>('Ručak');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmUncook, setConfirmUncook] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  const ingredientById = new Map(ingredients?.map((item) => [item.id, item]) ?? []);

  const invalidateMealData = async (planId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.meal(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans }),
      queryClient.invalidateQueries({ queryKey: planId ? queryKeys.meals(planId) : queryKeys.mealPlans }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems }),
      queryClient.invalidateQueries({ queryKey: queryKeys.missing }),
      queryClient.invalidateQueries({ queryKey: ['consumptionLogs'] }),
    ]);
  };

  const handleCook = async () => {
    if (!meal || !recipe) return;
    const names = new Map<string, string>();
    for (const item of recipe.ingredients) {
      if (item.ingredientName?.trim()) {
        names.set(item.ingredientId, item.ingredientName.trim());
      }
    }
    for (const [id, ingredient] of ingredientById) {
      if (!names.has(id) && ingredient.name.trim()) {
        names.set(id, ingredient.name.trim());
      }
    }
    const previewResult = await buildConsumptionPreview(meal, recipe.baseServings, names);
    const counted = previewResult.items.filter((item) => !item.trackPresence);
    const presence = previewResult.items.filter((item) => item.trackPresence);
    countedOverrides.current = new Map();
    if (counted.length > 0) {
      setPendingPresence(presence);
      setPreview(counted);
      return;
    }
    if (presence.length > 0) {
      setPresenceChecks(
        presence.map((item) => ({
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          stillHave: true,
        }))
      );
      return;
    }
    setBusy(true);
    try {
      await consumeMeal({ meal, recipeBaseServings: recipe.baseServings });
      await invalidateMealData(meal.mealPlanId);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const finishCook = async (presenceStillHave?: Map<string, boolean>) => {
    if (!meal || !recipe) return;
    setBusy(true);
    try {
      await consumeMeal({
        meal,
        recipeBaseServings: recipe.baseServings,
        overrides: countedOverrides.current,
        presenceStillHave,
      });
      setPreview(null);
      setPresenceChecks(null);
      setPendingPresence([]);
      await invalidateMealData(meal.mealPlanId);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const confirmCook = async () => {
    if (!preview) return;
    countedOverrides.current = new Map(preview.map((item) => [item.ingredientId, item.willConsume]));
    if (pendingPresence.length > 0) {
      setPreview(null);
      setPresenceChecks(
        pendingPresence.map((item) => ({
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          stillHave: true,
        }))
      );
      return;
    }
    await finishCook();
  };

  const confirmPresence = async () => {
    if (!presenceChecks) return;
    await finishCook(
      new Map(presenceChecks.map((item) => [item.ingredientId, item.stillHave]))
    );
  };

  const handlePartial = () => {
    if (!partialItem) return;
    const quantity = Math.max(0, parseQuantity(partialQuantity));
    setPreview(
      (current) =>
        current?.map((item) =>
          item.ingredientId === partialItem.ingredientId
            ? { ...item, willConsume: Math.min(quantity, item.available || quantity) }
            : item
        ) ?? null
    );
    setPartialItem(null);
    setPartialQuantity('');
  };

  const openRelocate = (mode: 'copy' | 'move') => {
    if (!meal) return;
    const today = todayISO();
    setTargetDate(isPastDay(meal.date, today) ? today : meal.date);
    setTargetMealType(meal.mealType);
    setRelocateMode(mode);
  };

  const confirmRelocate = async () => {
    if (!meal || !targetDate || !relocateMode) return;
    const unchanged = targetDate === meal.date && targetMealType === meal.mealType;
    if (relocateMode === 'move' && unchanged) {
      setRelocateMode(null);
      return;
    }

    setBusy(true);
    try {
      if (relocateMode === 'copy') {
        await copyMeal(meal, targetDate, targetMealType);
        await invalidateMealData(meal.mealPlanId);
        setRelocateMode(null);
        setNotice({
          title: 'Obrok kopiran',
          message: `Kopija je na ${formatDisplayDate(targetDate)} · ${targetMealType}.`,
        });
        return;
      }

      await moveMeal(meal, targetDate, targetMealType);
      await invalidateMealData(meal.mealPlanId);
      setRelocateMode(null);
      setNotice({
        title: 'Obrok pomeren',
        message: `Sada je na ${formatDisplayDate(targetDate)} · ${targetMealType}.`,
      });
    } catch (err) {
      setNotice({
        title: 'Nije sačuvano',
        message: err instanceof Error ? err.message : 'Pokušaj ponovo.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!meal || !canDeleteMeal(meal)) return;
    setConfirmDelete(true);
  };

  const confirmDeleteMeal = async () => {
    if (!meal || !canDeleteMeal(meal)) return;
    await deleteMeal(meal);
    setConfirmDelete(false);
    await invalidateMealData(meal.mealPlanId);
    router.back();
  };

  const confirmUncookMeal = async () => {
    if (!meal?.isCooked || busy) return;
    setBusy(true);
    try {
      await unconsumeMeal(meal);
      setConfirmUncook(false);
      await invalidateMealData(meal.mealPlanId);
    } catch {
      setConfirmUncook(false);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || recipeLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.loadingText}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  if (!meal || !recipe) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState title="Obrok nije pronađen" message="" />
      </SafeAreaView>
    );
  }

  const cookView = buildMealCookView(
    meal,
    recipe,
    new Map((ingredients ?? []).map((item) => [item.id, item.name]))
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: recipe.name, headerTitle: '' }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <EmojiBadge emoji={getRecipeEmoji(recipe.name, recipe.emoji)} size={88} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>{recipe.name}</Text>
            {isCreatedToday(recipe.createdAt) ? <NewBadge /> : null}
          </View>
          <Text style={styles.subtitle}>
            {formatDisplayDate(meal.date)} · {meal.mealType} · {formatServings(meal.servings)}
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            {meal.isCooked ? 'Već kuvano' : 'Spremno za kuvanje'}
          </Text>
          <Text style={styles.cardBody}>
            {meal.isCooked
              ? 'Zalihe su već umanjene za ovaj obrok.'
              : 'Označi kao kuvano da umanjiš zalihe nakon pripreme.'}
          </Text>
        </Card>

        {cookView.ingredients.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sastojci</Text>
            {cookView.servings !== cookView.baseServings ? (
              <Text style={styles.sectionHint}>
                Količine su za {formatServings(cookView.servings)} (recept je za{' '}
                {formatServings(cookView.baseServings)}).
              </Text>
            ) : null}
            {cookView.ingredients.map((item) => {
              const ingredient = ingredientById.get(item.ingredientId);
              return (
                <Card key={item.id} style={styles.ingredientCard}>
                  <View style={styles.ingredientRow}>
                    <EmojiBadge
                      emoji={getIngredientEmoji(
                        item.name,
                        ingredient?.category,
                        ingredient?.emoji
                      )}
                      size={36}
                      name={item.name}
                    />
                    <View style={styles.ingredientBody}>
                      <Text style={styles.ingredientName}>{item.name}</Text>
                      <Text style={styles.ingredientQuantity}>
                        {formatAmount(item.quantity, item.unit)}
                      </Text>
                      {item.notes ? (
                        <Text style={styles.ingredientNote}>{item.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}

        {cookView.steps.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Koraci pripreme</Text>
            {cookView.steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {cookView.recipeNotes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Napomena recepta</Text>
            <Text style={styles.stepText}>{cookView.recipeNotes}</Text>
          </View>
        ) : null}

        {cookView.mealNotes ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Napomena</Text>
            <Text style={styles.cardBody}>{cookView.mealNotes}</Text>
          </Card>
        ) : null}

        <View style={styles.actions}>
          {meal.isCooked ? (
            <Button
              title="Poništi kuvanje"
              onPress={() => setConfirmUncook(true)}
              variant="secondary"
            />
          ) : (
            <Button title="Označi kao kuvano" onPress={handleCook} />
          )}
          <Button
            title="Otvori recept"
            onPress={() => router.push(`/recipes/${cookView.recipeId}`)}
            variant="secondary"
          />
          <Button title="Kopiraj obrok" onPress={() => openRelocate('copy')} variant="secondary" />
          <Button title="Pomeri obrok" onPress={() => openRelocate('move')} variant="secondary" />
          <Button
            title="Izmeni obrok"
            onPress={() => router.push(`/meals/edit/${meal.id}`)}
            variant="secondary"
          />
          {canDeleteMeal(meal) ? (
            <Button title="Obriši obrok" onPress={handleDelete} variant="danger" />
          ) : null}
        </View>
      </ScrollView>

      <AppSheet
        visible={preview !== null}
        onClose={() => setPreview(null)}
        title="Potvrdi potrošnju"
        subtitle="Ovo se skida sa zaliha posle kuvanja."
        icon="restaurant-outline"
        footer={
          <SheetFooter
            confirmLabel="Potvrdi"
            onConfirm={confirmCook}
            onCancel={() => setPreview(null)}
            loading={busy}
          />
        }
      >
        {preview?.length === 0 ? (
          <Text style={styles.emptyPreview}>Recept nema sastojaka za oduzimanje.</Text>
        ) : (
          preview?.map((item) => {
            const ingredient = ingredientById.get(item.ingredientId);
            const name = displayIngredientName(item.ingredientName);
            return (
              <View key={item.ingredientId} style={styles.previewRow}>
                <EmojiBadge
                  emoji={getIngredientEmoji(name, ingredient?.category, ingredient?.emoji)}
                  name={name}
                  size={40}
                />
                <View style={styles.previewText}>
                  <Text style={styles.previewName}>{name}</Text>
                  <Text style={styles.previewMeta}>
                    treba {formatAmount(item.quantity, item.unit)} · imaš{' '}
                    {formatAmount(item.available, item.unit)}
                  </Text>
                </View>
                <View style={styles.previewSide}>
                  <View
                    style={[
                      styles.qtyPill,
                      item.willConsume <= 0 && styles.qtyPillMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.previewQuantity,
                        item.willConsume <= 0 && styles.previewQuantityMuted,
                      ]}
                    >
                      {item.willConsume > 0
                        ? `−${formatAmount(item.willConsume, item.unit)}`
                        : 'nema'}
                    </Text>
                  </View>
                  {item.available > 0 ? (
                    <Pressable
                      onPress={() => {
                        setPartialItem(item);
                        setPartialQuantity(formatQuantity(item.willConsume));
                      }}
                      style={styles.partialChip}
                    >
                      <Text style={styles.partialLink}>Delimično</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </AppSheet>

      <AppSheet
        visible={presenceChecks !== null}
        onClose={() => setPresenceChecks(null)}
        title="Još uvek imaš?"
        subtitle="Ove namirnice se ne skidaju po količini. Označi šta je ostalo."
        icon="help-circle-outline"
        footer={
          <SheetFooter
            confirmLabel="Potvrdi"
            onConfirm={confirmPresence}
            onCancel={() => setPresenceChecks(null)}
            loading={busy}
          />
        }
      >
        {presenceChecks?.map((item) => (
          <ToggleRow
            key={item.ingredientId}
            label={displayIngredientName(item.ingredientName)}
            value={item.stillHave}
            onValueChange={(stillHave) =>
              setPresenceChecks(
                (current) =>
                  current?.map((row) =>
                    row.ingredientId === item.ingredientId ? { ...row, stillHave } : row
                  ) ?? null
              )
            }
          />
        ))}
      </AppSheet>

      <AppSheet
        visible={partialItem !== null}
        onClose={() => setPartialItem(null)}
        title="Delimična potrošnja"
        subtitle={
          partialItem
            ? `Koliko ${partialItem.ingredientName} želiš da potrošiš?`
            : undefined
        }
        icon="pencil-outline"
        footer={
          <SheetFooter
            confirmLabel="Sačuvaj"
            onConfirm={handlePartial}
            onCancel={() => setPartialItem(null)}
          />
        }
      >
        <Input
          label={`Količina (${partialItem?.unit ?? ''})`}
          value={partialQuantity}
          onChangeText={setPartialQuantity}
          keyboardType="numeric"
          placeholder="npr. ½"
        />
      </AppSheet>

      <AppSheet
        visible={relocateMode !== null}
        onClose={() => setRelocateMode(null)}
        title={relocateMode === 'copy' ? 'Kopiraj obrok' : 'Pomeri obrok'}
        subtitle={
          relocateMode === 'copy'
            ? 'Original ostaje u planu. Izaberi mesto za kopiju.'
            : 'Obrok prelazi na novi datum i tip.'
        }
        icon={relocateMode === 'copy' ? 'copy-outline' : 'swap-horizontal-outline'}
        footer={
          <SheetFooter
            confirmLabel={relocateMode === 'copy' ? 'Kopiraj' : 'Pomeri'}
            onConfirm={confirmRelocate}
            onCancel={() => setRelocateMode(null)}
            loading={busy}
            confirmDisabled={!targetDate}
          />
        }
      >
        <DateField
          label="Datum"
          value={targetDate}
          onChange={(next) => next && setTargetDate(next)}
          minimumDate={todayISO()}
        />
        <Text style={styles.label}>Tip obroka</Text>
        <ChipRow
          items={mealTypes}
          selected={targetMealType}
          onSelect={(value) => value && setTargetMealType(value as MealType)}
          allowDeselect={false}
          padded={false}
        />
      </AppSheet>

      <ConfirmSheet
        visible={confirmUncook}
        title="Poništi kuvanje"
        message="Zalihe se vraćaju u kuhinju. Obrok više nije označen kao kuvano."
        confirmLabel="Poništi"
        variant="warning"
        onConfirm={confirmUncookMeal}
        onCancel={() => setConfirmUncook(false)}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title="Obriši obrok"
        message="Obrok nestaje iz plana. Ovo se ne može opozvati."
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={confirmDeleteMeal}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmSheet
        visible={notice !== null}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        confirmLabel="U redu"
        variant="success"
        hideCancel
        onConfirm={() => {
          setNotice(null);
          router.back();
        }}
        onCancel={() => {
          setNotice(null);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: spacing.xxxl,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    margin: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
  },
  cardBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  ingredientCard: {
    marginBottom: spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ingredientBody: {
    flex: 1,
  },
  ingredientName: {
    ...typography.h3,
    color: colors.text,
  },
  ingredientQuantity: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  ingredientNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  stepNumber: {
    ...typography.body,
    color: colors.primary,
    width: 28,
  },
  stepText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
  emptyPreview: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  previewText: {
    flex: 1,
    minWidth: 0,
  },
  previewName: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  previewMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  previewSide: {
    alignItems: 'flex-end',
    gap: 6,
  },
  qtyPill: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  qtyPillMuted: {
    backgroundColor: '#F5F5F4',
  },
  previewQuantity: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  previewQuantityMuted: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  partialChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceAlt,
  },
  partialLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
