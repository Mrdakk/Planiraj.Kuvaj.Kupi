import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { Input } from '@/components/ui/Input';
import { UnitPicker } from '@/components/ui/UnitPicker';
import { addManualShoppingItem, ensureShoppingList } from '@/features/shopping/service';
import { invalidateAfterShoppingChange } from '@/hooks/invalidate';
import { usePlanWeek } from '@/hooks/usePlanWeek';
import type { Unit } from '@/constants/units';
import { parsePositiveQuantity } from '@/lib/formatQuantity';
import { errorMessage } from '@/lib/errorMessage';
import { groceryStoreSections, type GroceryStoreSection } from '@/constants/categories';

export default function CreateShoppingItemScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { weekStart } = usePlanWeek();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<Unit>('kom');
  const [category, setCategory] = useState<GroceryStoreSection>('Ostalo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedQuantity = parsePositiveQuantity(quantity);
  const quantityError =
    quantity.trim() && parsedQuantity === null ? 'Količina mora biti veća od 0.' : undefined;
  const canSubmit = !!name.trim() && parsedQuantity !== null && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || parsedQuantity === null) return;
    setLoading(true);
    try {
      const shoppingList = await ensureShoppingList(weekStart);
      await addManualShoppingItem(shoppingList.id, name.trim(), parsedQuantity, unit, category);
      await invalidateAfterShoppingChange(queryClient);
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Dodaj stavku' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Naziv" value={name} onChangeText={setName} placeholder="npr. hleb" />

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

        <Text style={styles.label}>Deo prodavnice</Text>
        <View style={styles.pickerContainer}>
          <Picker
            dropdownIconColor={colors.text}
            style={styles.picker}
            selectedValue={category}
            onValueChange={(value) => setCategory(value as GroceryStoreSection)}
          >
            {groceryStoreSections.map((section) => (
              <Picker.Item color={colors.text} key={section} label={section} value={section} />
            ))}
          </Picker>
        </View>

        <Text style={styles.hint}>Kad označiš kao kupljeno, stavka ide i u kuhinju.</Text>

        <Button title="Dodaj u listu" onPress={handleSubmit} loading={loading} disabled={!canSubmit} />
      </ScrollView>
      <ConfirmSheet
        visible={error !== null}
        title="Stavka nije dodata"
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
    marginBottom: -spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  picker: {
    color: colors.text,
  },
});
