import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { UnitPicker } from '@/components/ui/UnitPicker';
import { useDeleteShoppingItem, useShoppingItem } from '@/hooks/useShoppingList';
import { updateShoppingItemDetails } from '@/features/shopping/service';
import { invalidateAfterShoppingChange } from '@/hooks/invalidate';
import type { Unit } from '@/constants/units';
import { formatEditableQuantity, parsePositiveQuantity } from '@/lib/formatQuantity';
import { displayIngredientName } from '@/lib/ingredientNames';
import { errorMessage } from '@/lib/errorMessage';

export default function EditShoppingItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: item, isLoading } = useShoppingItem(id);
  const deleteItem = useDeleteShoppingItem();

  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('kom');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setQuantity(formatEditableQuantity(item.quantity));
    setUnit(item.unit);
  }, [item?.id]);

  const name = displayIngredientName(item?.name);
  const parsedQuantity = parsePositiveQuantity(quantity);
  const quantityError =
    quantity.trim() && parsedQuantity === null ? 'Količina mora biti veća od 0.' : undefined;

  const handleSave = async () => {
    if (!item || parsedQuantity === null || saving) return;
    setSaving(true);
    try {
      await updateShoppingItemDetails(item, parsedQuantity, unit);
      await invalidateAfterShoppingChange(queryClient);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await deleteItem.mutateAsync(item);
      setConfirmDelete(false);
      router.back();
    } catch (err) {
      setConfirmDelete(false);
      setError(errorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Stavka' }} />
        <Text style={styles.loading}>Učitavanje...</Text>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={{ title: 'Stavka' }} />
        <EmptyState
          title="Stavka nije pronađena"
          message="Možda je već kupljena ili obrisana."
          actionTitle="Nazad"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: name || 'Stavka' }} />
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Količina"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="npr. 1"
              keyboardType="decimal-pad"
              error={quantityError}
            />
          </View>
          <View style={styles.half}>
            <UnitPicker value={unit} onChange={setUnit} />
          </View>
        </View>

        <Button
          title="Sačuvaj izmene"
          onPress={handleSave}
          loading={saving}
          disabled={parsedQuantity === null}
        />
        <Button title="Obriši stavku" onPress={() => setConfirmDelete(true)} variant="danger" />
      </View>

      <ConfirmSheet
        visible={confirmDelete}
        title="Obriši stavku"
        message={`${name} nestaje sa liste. Ovo se ne može opozvati.`}
        confirmLabel="Obriši"
        variant="danger"
        loading={deleteItem.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmSheet
        visible={error !== null}
        title="Nije sačuvano"
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
  loading: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
});
