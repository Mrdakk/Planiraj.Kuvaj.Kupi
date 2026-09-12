import { useEffect, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Input } from '@/components/ui/Input';
import { ToggleRow } from '@/components/ui/ToggleRow';
import { addPantryItem } from '@/features/pantry/service';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { allUnits, type Unit } from '@/constants/units';
import { parseQuantity } from '@/lib/formatQuantity';
import {
  ingredientCategories,
  isIngredientCategory,
  type IngredientCategory,
} from '@/constants/categories';
import { queryKeys } from '@/hooks/queryKeys';

function categoryFromParam(value: string | string[] | undefined): IngredientCategory {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && isIngredientCategory(raw) ? raw : 'Ostalo';
}

export default function CreatePantryItemScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<Unit>('kom');
  const [category, setCategory] = useState<IngredientCategory>(() =>
    categoryFromParam(params.category)
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [trackPresence, setTrackPresence] = useState(false);
  const [inStock, setInStock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCategory(categoryFromParam(params.category));
  }, [params.category]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (!trackPresence && !quantity.trim()) return;
    setLoading(true);
    try {
      await addPantryItem({
        rawName: name.trim(),
        quantity: trackPresence ? 1 : parseQuantity(quantity),
        unit,
        category,
        expiresAt: expiresAt || undefined,
        notes: notes.trim(),
        trackPresence,
        inStock,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      await queryClient.invalidateQueries({ queryKey: queryKeys.missing });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Namirnica nije sačuvana.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Dodaj namirnicu' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input
          label="Naziv sastojka"
          value={name}
          onChangeText={setName}
          placeholder="npr. pileći file"
        />

        <Text style={styles.label}>Tip namirnice</Text>
        <View style={styles.pickerContainer}>
          <Picker
            dropdownIconColor={colors.text}
            style={{ color: colors.text }}
            selectedValue={category}
            onValueChange={(value) => setCategory(value as IngredientCategory)}
          >
            {ingredientCategories.map((item) => (
              <Picker.Item color={colors.text} key={item} label={item} value={item} />
            ))}
          </Picker>
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
                placeholder="npr. 800"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Jedinica</Text>
              <View style={styles.pickerContainer}>
                <Picker dropdownIconColor={colors.text} style={{ color: colors.text }} selectedValue={unit} onValueChange={(value) => setUnit(value as Unit)}>
                  {allUnits.map((u) => (
                    <Picker.Item color={colors.text} key={u} label={u} value={u} />
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
          placeholder="npr. Otvoreno - u frižideru"
          multiline
        />

        <Button
          title="Sačuvaj"
          onPress={handleSubmit}
          loading={loading}
          disabled={!name.trim() || (!trackPresence && !quantity.trim())}
        />
      </ScrollView>
      <ConfirmSheet
        visible={error !== null}
        title="Već postoji"
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
    paddingBottom: spacing.xxxl,
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
});
