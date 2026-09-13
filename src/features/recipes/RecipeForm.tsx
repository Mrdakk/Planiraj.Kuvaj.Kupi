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
import { IngredientEditActions } from '@/features/ingredients/IngredientEditActions';
import { IngredientPickerSheet } from '@/features/ingredients/IngredientPickerSheet';
import { IngredientRenameSheet } from '@/features/ingredients/IngredientRenameSheet';
import { useIngredients } from '@/hooks/useIngredients';
import { formatQuantity } from '@/lib/formatQuantity';
import { canonicalIngredientName, displayIngredientName } from '@/lib/ingredientNames';
import type { Ingredient, RecipeWithIngredients } from '@/types';

export interface RecipeFormIngredient {
  id?: string;
  ingredientId?: string;
  rawName: string;
  sourceName?: string;
  linkToIngredientId?: string;
  quantity: string;
  unit: Unit;
  notes: string;
}

export interface RecipeFormData {
  name: string;
  description: string;
  baseServings: number;
  prepTimeMinutes: number | undefined;
  mealTypes: MealType[];
  dishType: DishType | '';
  steps: string;
  notes: string;
  ingredients: RecipeFormIngredient[];
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
  const { data: catalog } = useIngredients();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
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
        ingredients: defaultValues.ingredients.map((i) => {
          const rawName = canonicalIngredientName(i.ingredientName ?? '');
          return {
            id: i.id,
            ingredientId: i.ingredientId,
            rawName,
            sourceName: rawName,
            quantity: formatQuantity(i.quantity),
            unit: i.unit,
            notes: i.notes ?? '',
          };
        }),
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

  const selected = selectedIndex !== null ? form.ingredients[selectedIndex] : null;

  const updateField = <K extends keyof RecipeFormData,>(field: K, value: RecipeFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateIngredient = (
    index: number,
    field: keyof RecipeFormIngredient,
    value: string
  ) => {
    setForm((prev) => {
      const ingredients = prev.ingredients.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value } as RecipeFormIngredient;
      });
      return { ...prev, ingredients };
    });
  };

  const patchIngredient = (index: number, patch: Partial<RecipeFormIngredient>) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const addIngredient = () => {
    const nextIndex = form.ingredients.length;
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { rawName: '', quantity: '', unit: 'kom', notes: '' }],
    }));
    setSelectedIndex(nextIndex);
    setRenameOpen(true);
  };

  const removeIngredient = (index: number) => {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
    setSelectedIndex((current) => {
      if (current === null) return current;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  };

  const handleLink = (keep: Ingredient) => {
    if (selectedIndex === null) return;
    const current = form.ingredients[selectedIndex];
    patchIngredient(selectedIndex, {
      rawName: keep.name,
      linkToIngredientId: keep.id,
      sourceName: current?.sourceName || current?.rawName || keep.name,
    });
    setSelectedIndex(null);
  };

  const handleRename = (name: string) => {
    if (selectedIndex === null) return;
    const current = form.ingredients[selectedIndex];
    patchIngredient(selectedIndex, {
      rawName: name,
      linkToIngredientId: undefined,
      sourceName: current?.sourceName || current?.rawName || name,
    });
    setSelectedIndex(null);
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
    <>
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
          dropdownIconColor={colors.text}
          style={{ color: colors.text }}
          selectedValue={form.dishType}
          onValueChange={(value) => updateField('dishType', value as DishType | '')}
        >
          <Picker.Item color={colors.text} label="Nije izabrano" value="" />
          {dishTypes.map((type) => (
            <Picker.Item color={colors.text} key={type} label={type} value={type} />
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
      <Text style={styles.hint}>Dodirni namirnicu za Preimenuj ili Poveži.</Text>

      {form.ingredients.map((ingredient, index) => {
        const name = displayIngredientName(ingredient.rawName);
        const label = ingredient.rawName.trim() ? name : 'Dodaj naziv';
        const showActions = selectedIndex === index;
        return (
          <Card key={ingredient.id ?? index} style={styles.ingredientCard}>
            <Text style={styles.label}>Namirnica</Text>
            <Pressable
              onPress={() => {
                const empty = !ingredient.rawName.trim();
                if (selectedIndex === index && !empty) {
                  setSelectedIndex(null);
                  return;
                }
                setSelectedIndex(index);
                if (empty) setRenameOpen(true);
              }}
              style={styles.nameHit}
            >
              <Text style={styles.ingredientName}>{label}</Text>
            </Pressable>
            {showActions ? (
              <IngredientEditActions
                onRename={() => setRenameOpen(true)}
                onLink={() => setPickerOpen(true)}
              />
            ) : null}

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
                    dropdownIconColor={colors.text}
                    style={{ color: colors.text }}
                    selectedValue={ingredient.unit}
                    onValueChange={(value) => updateIngredient(index, 'unit', value as Unit)}
                  >
                    {allUnits.map((unit) => (
                      <Picker.Item color={colors.text} key={unit} label={unit} value={unit} />
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
        );
      })}

      <Button
        title="+ Dodaj sastojak"
        variant="secondary"
        onPress={addIngredient}
      />

      <View style={styles.submitButton}>
        <Button title={submitTitle} onPress={handleSubmit} loading={loading} />
      </View>
    </ScrollView>
    <IngredientPickerSheet
      visible={pickerOpen}
      onClose={() => setPickerOpen(false)}
      ingredients={catalog ?? []}
      excludeIds={[
        selected?.linkToIngredientId,
        selected?.ingredientId,
      ].filter((id): id is string => Boolean(id))}
      absorbName={selected?.rawName ?? selected?.sourceName ?? ''}
      onConfirm={handleLink}
    />
    <IngredientRenameSheet
      visible={renameOpen}
      onClose={() => setRenameOpen(false)}
      initialName={selected?.rawName ?? ''}
      onSave={handleRename}
    />
    </>
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
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  ingredientCard: {
    marginBottom: spacing.md,
  },
  nameHit: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ingredientName: {
    ...typography.body,
    color: colors.text,
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
