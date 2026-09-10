import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmojiBadge } from '@/components/ui/EmojiBadge';
import { AppSheet } from '@/components/ui/AppSheet';
import { ListRow } from '@/components/ui/ListRow';
import { ToggleRow } from '@/components/ui/ToggleRow';
import {
  usePantryItem,
  usePantryItems,
  useUpdatePantryItem,
  useDeletePantryItem,
} from '@/hooks/usePantryItems';
import { useIngredients, useUpdateIngredient } from '@/hooks/useIngredients';
import { allUnits, type Unit } from '@/constants/units';
import { formatQuantity, parseQuantity } from '@/lib/formatQuantity';
import { displayIngredientName, ingredientMatchesSearch } from '@/lib/ingredientNames';
import { getIngredientEmoji } from '@/constants/emojis';
import { linkIngredients, linkableIngredients } from '@/features/ingredients/link';
import { isPresenceInStock, presenceQuantity, tracksPresence } from '@/features/pantry/presence';
import { queryKeys } from '@/hooks/queryKeys';
import type { Ingredient } from '@/types';

export default function PantryItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: item, isLoading } = usePantryItem(id);
  const { data: pantryItems } = usePantryItems();
  const { data: ingredients } = useIngredients();
  const update = useUpdatePantryItem();
  const updateIngredient = useUpdateIngredient();
  const deleteItem = useDeletePantryItem();

  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('kom');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [trackPresence, setTrackPresence] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingAbsorb, setPendingAbsorb] = useState<Ingredient | null>(null);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingredient = ingredients?.find((i) => i.id === item?.ingredientId);

  const otherIngredients = useMemo(() => {
    if (!item || !pantryItems || !ingredients) return [];
    return linkableIngredients(item, pantryItems, ingredients);
  }, [item, pantryItems, ingredients]);

  const filteredOthers = useMemo(
    () => otherIngredients.filter((row) => ingredientMatchesSearch(row.name, search)),
    [otherIngredients, search]
  );

  useEffect(() => {
    if (!item) return;
    setQuantity(formatQuantity(item.quantity));
    setUnit(item.unit);
    setExpiresAt(item.expiresAt ?? null);
    setNotes(item.notes ?? '');
    setInStock(isPresenceInStock(item.quantity));
  }, [item?.id]);

  useEffect(() => {
    if (!ingredient) return;
    setTrackPresence(tracksPresence(ingredient));
  }, [ingredient?.id, ingredient?.trackPresence]);

  const handleUpdate = async () => {
    if (!item) return;
    const nextQuantity = trackPresence ? presenceQuantity(inStock) : parseQuantity(quantity);
    update.mutate({
      ...item,
      quantity: nextQuantity,
      unit,
      expiresAt: expiresAt || null,
      notes: notes.trim() || null,
      updatedAt: new Date().toISOString(),
    });
    if (ingredient && tracksPresence(ingredient) !== trackPresence) {
      updateIngredient.mutate({
        ...ingredient,
        trackPresence,
        updatedAt: new Date().toISOString(),
      });
    }
    router.back();
  };

  const handleDelete = () => setConfirmDelete(true);

  const closePicker = () => {
    setPickerOpen(false);
    setSearch('');
  };

  const handleLink = async () => {
    if (!ingredient || !pendingAbsorb || linking) return;
    setLinking(true);
    try {
      await linkIngredients(pendingAbsorb.id, ingredient.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems }),
        queryClient.invalidateQueries({ queryKey: ['pantryItems', id] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.ingredients }),
        queryClient.invalidateQueries({ queryKey: queryKeys.recipes }),
        queryClient.invalidateQueries({ queryKey: queryKeys.missing }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists }),
      ]);
      setPendingAbsorb(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Povezivanje nije uspelo.');
      setPendingAbsorb(null);
    } finally {
      setLinking(false);
    }
  };

  const name = displayIngredientName(ingredient?.name ?? 'Namirnica');
  const screenOptions = { title: name };
  const absorbName = pendingAbsorb ? displayIngredientName(pendingAbsorb.name) : '';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Namirnica' }} />
        <Text style={styles.subtitle}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Namirnica' }} />
        <EmptyState title="Sastojak nije pronađen" message="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <EmojiBadge
            emoji={getIngredientEmoji(name, ingredient?.category, ingredient?.emoji)}
            size={112}
            name={name}
          />
          <Text style={styles.title}>{name}</Text>
          {ingredient?.category ? (
            <Text style={styles.category}>{ingredient.category}</Text>
          ) : null}
        </View>

        <ToggleRow
          label="Ne brojim količinu"
          subtitle="Samo znam da li je imam ili ne."
          value={trackPresence}
          onValueChange={setTrackPresence}
        />

        {trackPresence ? (
          <ToggleRow label="Imam" value={inStock} onValueChange={setInStock} />
        ) : (
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Količina"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Jedinica</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={unit} onValueChange={(value) => setUnit(value as Unit)}>
                  {allUnits.map((u) => (
                    <Picker.Item key={u} label={u} value={u} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        )}

        <DateField
          label="Rok trajanja"
          value={expiresAt}
          onChange={setExpiresAt}
          optional
          placeholder="Nije postavljen"
        />

        <Input
          label="Napomena"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Button title="Sačuvaj izmene" onPress={handleUpdate} />
        {otherIngredients.length > 0 ? (
          <Button title="Poveži namirnice" onPress={() => setPickerOpen(true)} variant="secondary" />
        ) : null}
        <Button title="Obriši sastojak" onPress={handleDelete} variant="danger" />
      </ScrollView>

      <AppSheet
        visible={pickerOpen}
        onClose={closePicker}
        title="Poveži namirnice"
        subtitle="Izaberi namirnicu koja nestaje. Recepti će koristiti ovu."
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
        {filteredOthers.length === 0 ? (
          <Text style={styles.empty}>Nema namirnice za ovu pretragu.</Text>
        ) : (
          <ScrollView
            style={styles.pickerList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredOthers.map((other) => {
              const otherName = displayIngredientName(other.name);
              return (
                <View key={other.id} style={styles.pickerRow}>
                  <ListRow
                    emoji={getIngredientEmoji(otherName, other.category, other.emoji)}
                    title={otherName}
                    subtitle={other.category}
                    onPress={() => {
                      closePicker();
                      setPendingAbsorb(other);
                    }}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </AppSheet>

      <ConfirmSheet
        visible={pendingAbsorb !== null}
        title="Poveži namirnice"
        message={`${absorbName} nestaje. Recepti će koristiti ${name}.`}
        confirmLabel="Poveži"
        variant="warning"
        loading={linking}
        onConfirm={handleLink}
        onCancel={() => {
          if (linking) return;
          setPendingAbsorb(null);
        }}
      />
      <ConfirmSheet
        visible={confirmDelete}
        title="Obriši sastojak"
        message="Stavka nestaje sa zaliha. Ovo se ne može opozvati."
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={() => {
          deleteItem.mutate(id, { onSuccess: () => router.back() });
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmSheet
        visible={error !== null}
        title="Nije povezano"
        message={error ?? ''}
        confirmLabel="U redu"
        variant="warning"
        hideCancel
        onConfirm={() => setError(null)}
        onCancel={() => setError(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  category: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
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
  pickerList: {
    maxHeight: 360,
  },
  pickerRow: {
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
