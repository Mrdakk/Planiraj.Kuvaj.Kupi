import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useShoppingList } from '@/hooks/useShoppingList';
import { addManualShoppingItem, ensureShoppingList } from '@/features/shopping/service';
import { queryKeys } from '@/hooks/queryKeys';
import { getWeekStart } from '@/features/planner/service';
import { allUnits, type Unit } from '@/constants/units';
import { parseQuantity } from '@/lib/formatQuantity';
import { groceryStoreSections, type GroceryStoreSection } from '@/constants/categories';

export default function CreateShoppingItemScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const weekStart = getWeekStart(new Date());
  const { data: list } = useShoppingList(weekStart);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('kom');
  const [category, setCategory] = useState<GroceryStoreSection>('Ostalo');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !quantity.trim()) return;
    setLoading(true);
    try {
      const shoppingList = list ?? (await ensureShoppingList(weekStart));
      await addManualShoppingItem(
        shoppingList.id,
        name.trim(),
        parseQuantity(quantity),
        unit,
        category
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists });
      await queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItems(shoppingList.id) });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Dodaj stavku</Text>
      <View style={styles.content}>
        <Input
          label="Naziv"
          value={name}
          onChangeText={setName}
          placeholder="npr. hleb"
        />

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
              <Picker selectedValue={unit} onValueChange={(value) => setUnit(value as Unit)}>
                {allUnits.map((u) => (
                  <Picker.Item key={u} label={u} value={u} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Kategorija</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            onValueChange={(value) => setCategory(value as GroceryStoreSection)}
          >
            {groceryStoreSections.map((s) => (
              <Picker.Item key={s} label={s} value={s} />
            ))}
          </Picker>
        </View>

        <Button
          title="Dodaj u listu"
          onPress={handleSubmit}
          loading={loading}
          disabled={!name.trim() || !quantity.trim()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
