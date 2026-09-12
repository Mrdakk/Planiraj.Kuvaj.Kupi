import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Button } from '@/components/ui/Button';
import { ChipToggleRow } from '@/components/ui/ChipRow';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { allUnits, type Unit } from '@/constants/units';
import { dishTypes, mealTypes, type DishType, type MealType } from '@/constants/categories';
import { colors, spacing, typography } from '@/constants/theme';
import { formatQuantity } from '@/lib/formatQuantity';
import { canonicalIngredientName } from '@/lib/ingredientNames';
import type { RecipeWithIngredients } from '@/types';

export interface RecipeFormData {
  name: string;
  description: string;
  baseServings: number;
  prepTimeMinutes: number | undefined;
  mealTypes: MealType[];
  dishType: DishType | '';
  steps: string;
  notes: string;
  ingredients: {
    id?: string;
    ingredientId?: string;
    rawName: string;
    quantity: string;
    unit: Unit;
    notes: string;
  }[];
}

interface RecipeFormProps {
  defaultValues?: RecipeWithIngredients;
  onSubmit: (data: RecipeFormData) => void;
  submitTitle: string;
  loading?: boolean;
}

export function RecipeForm({
  defaultValues,
  onSubmit,
  submitTitle,
  loading,
}: RecipeFormProps) {
  const [form, setForm] = useState<RecipeFormData>(() => {
    if (defaultValues) {
      return {
        name: defaultValues.name,
        description: defaultValues.description ?? '',
        baseServings: defaultValues.baseServings,
        prepTimeMinutes: defaultValues.prepTimeMinutes ?? undefined,
        mealTypes: defaultValues.mealTypes.length > 0 ? defaultValues.mealTypes : ['Ručak'],
        dishType: defaultValues.dishType ?? '',
        steps: defaultValues.steps.join('\n'),
        notes: defaultValues.notes ?? '',
        ingredients: defaultValues.ingredients.map((i) => ({
          id: i.id,
          ingredientId: i.ingredientId,
          rawName: canonicalIngredientName(i.ingredientName ?? ''),
          quantity: formatQuantity(i.quantity),
          unit: i.unit,
          notes: i.notes ?? '',
        })),
      };
    }
    return {
      name: '',
      description: '',
      baseServings: 4,
      prepTimeMinutes: undefined,
      mealTypes: ['Ručak'],
      dishType: '',
      steps: '',
      notes: '',
      ingredients: [{ rawName: '', quantity: '', unit: 'kom', notes: '' }],
    };
  });

  const updateField = <K extends keyof RecipeFormData,>(field: K, value: RecipeFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateIngredient = (
    index: number,
    field: keyof RecipeFormData['ingredients'][number],
    value: string
  ) => {
    setForm((prev) => {
      const ingredients = prev.ingredients.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value } as typeof item;
      });
      return { ...prev, ingredients };
    });
  };

  const addIngredient = () => {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { rawName: '', quantity: '', unit: 'kom', notes: '' }],
    }));
  };

  const removeIngredient = (index: number) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const toggleMealType = (value: string) => {
    const item = value as MealType;
    setForm((prev) => {
      const selected = prev.mealTypes.includes(item)
        ? prev.mealTypes.filter((type) => type !== item)
        : [...prev.mealTypes, item];
      return { ...prev, mealTypes: selected.length > 0 ? selected : prev.mealTypes };
    });
  };

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Input
        label="Naziv recepta"
        value={form.name}
        onChangeText={(text) => updateField('name', text)}
        placeholder="npr. Pasta bolonjeze"
      />

      <Input
        label="Opis"
        value={form.description}
        onChangeText={(text) => updateField('description', text)}
        placeholder="Kratak opis"
        multiline
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <Input
            label="Broj porcija"
            value={String(form.baseServings)}
            onChangeText={(text) => updateField('baseServings', Number(text) || 0)}
            placeholder="4"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.half}>
          <Input
            label="Vreme pripreme (min)"
            value={form.prepTimeMinutes !== undefined ? String(form.prepTimeMinutes) : ''}
            onChangeText={(text) =>
              updateField('prepTimeMinutes', text ? Number(text) : undefined)
            }
            placeholder="30"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.label}>Za koji obrok</Text>
      <View style={styles.chips}>
        <ChipToggleRow items={mealTypes} selected={form.mealTypes} onToggle={toggleMealType} />
      </View>

      <Text style={styles.label}>Tip jela</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={form.dishType}
          onValueChange={(value) => updateField('dishType', value as DishType | '')}
        >
          <Picker.Item label="Nije izabrano" value="" />
          {dishTypes.map((type) => (
            <Picker.Item key={type} label={type} value={type} />
          ))}
        </Picker>
      </View>

      <Input
        label="Koraci pripreme"
        value={form.steps}
        onChangeText={(text) => updateField('steps', text)}
        placeholder="Jedan korak po redu"
        multiline
        numberOfLines={4}
      />

      <Input
        label="Napomena"
        value={form.notes}
        onChangeText={(text) => updateField('notes', text)}
        placeholder="Dodatne napomene"
        multiline
      />

      <Text style={styles.sectionTitle}>Sastojci</Text>

      {form.ingredients.map((ingredient, index) => (
        <Card key={index} style={styles.ingredientCard}>
          <Input
            label="Naziv sastojka"
            value={ingredient.rawName}
            onChangeText={(text) => updateIngredient(index, 'rawName', text)}
            placeholder="npr. pileći file"
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Količina"
                value={ingredient.quantity}
                onChangeText={(text) => updateIngredient(index, 'quantity', text)}
                placeholder="npr. 600"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Jedinica</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={ingredient.unit}
                  onValueChange={(value) => updateIngredient(index, 'unit', value as Unit)}
                >
                  {allUnits.map((unit) => (
                    <Picker.Item key={unit} label={unit} value={unit} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <Input
            label="Napomena"
            value={ingredient.notes}
            onChangeText={(text) => updateIngredient(index, 'notes', text)}
            placeholder="npr. bez kostiju"
          />

          <Pressable onPress={() => removeIngredient(index)} style={styles.removeButton}>
            <Text style={styles.removeText}>Ukloni sastojak</Text>
          </Pressable>
        </Card>
      ))}

      <Button
        title="+ Dodaj sastojak"
        variant="secondary"
        onPress={addIngredient}
      />

      <View style={styles.submitButton}>
        <Button title={submitTitle} onPress={handleSubmit} loading={loading} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  chips: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  ingredientCard: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  removeButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  removeText: {
    ...typography.body,
    color: colors.danger,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
});
