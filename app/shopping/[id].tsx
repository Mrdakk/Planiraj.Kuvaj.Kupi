import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useDeleteShoppingItem, useShoppingItem } from '@/hooks/useShoppingList';
import { updateShoppingItemDetails } from '@/features/shopping/service';
import { queryKeys } from '@/hooks/queryKeys';
import { allUnits, type Unit } from '@/constants/units';
import { formatQuantity, parseQuantity } from '@/lib/formatQuantity';
import { displayIngredientName } from '@/lib/ingredientNames';

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

  useEffect(() => {
    if (!item) return;
    setQuantity(formatQuantity(item.quantity));
    setUnit(item.unit);
  }, [item?.id]);

  const name = displayIngredientName(item?.name);
  const screenOptions = { title: name || 'Stavka' };

  const handleSave = async () => {
    if (!item || !quantity.trim()) return;
    setSaving(true);
    try {
      await updateShoppingItemDetails(item, parseQuantity(quantity), unit);
      await queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItems(item.shoppingListId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItem(item.id) });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    await deleteItem.mutateAsync(item);
    setConfirmDelete(false);
    router.back();
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
        <EmptyState title="Stavka nije pronađena" message="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={screenOptions} />
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Količina"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="npr. 1"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Jedinica</Text>
            <View style={styles.pickerContainer}>
              <Picker dropdownIconColor={colors.text} style={{ color: colors.text }} selectedValue={unit} onValueChange={(value) => setUnit(value as Unit)}>
                {allUnits.map((option) => (
                  <Picker.Item color={colors.text} key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <Button
          title="Sačuvaj izmene"
          onPress={handleSave}
          loading={saving}
          disabled={!quantity.trim()}
        />
        <Button title="Obriši stavku" onPress={() => setConfirmDelete(true)} variant="danger" />
      </View>

      <ConfirmSheet
        visible={confirmDelete}
        title="Obriši stavku"
        message={`${name} nestaje sa liste. Ovo se ne može opozvati.`}
        confirmLabel="Obriši"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
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
    marginBottom: spacing.md,
  },
});
