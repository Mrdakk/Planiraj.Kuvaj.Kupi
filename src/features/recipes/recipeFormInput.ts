import type { Unit } from '@/constants/units';
import type { DishType, MealType } from '@/constants/categories';
import { parsePositiveQuantity } from '@/lib/formatQuantity';
import { parseServings } from '@/features/planner/servings';
import type { CreateRecipeInput } from './service';

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
  baseServings: string;
  prepTimeMinutes: string;
  mealTypes: MealType[];
  dishType: DishType | '';
  steps: string;
  notes: string;
  ingredients: RecipeFormIngredient[];
}

export interface RecipeFormErrors {
  name?: string;
  baseServings?: string;
  prepTimeMinutes?: string;
  ingredients?: string;
  /** Error per ingredient row index. */
  ingredientRows: Record<number, string>;
}

function hasName(item: RecipeFormIngredient): boolean {
  return Boolean(item.rawName.trim() || item.ingredientId || item.linkToIngredientId);
}

export function recipeFormToInput(form: RecipeFormData): {
  input: CreateRecipeInput | null;
  errors: RecipeFormErrors;
} {
  const errors: RecipeFormErrors = { ingredientRows: {} };

  const name = form.name.trim();
  if (!name) errors.name = 'Upiši naziv recepta.';

  const baseServings = parseServings(form.baseServings);
  if (baseServings === null) errors.baseServings = 'Najmanje 1 porcija.';

  let prepTimeMinutes: number | undefined;
  if (form.prepTimeMinutes.trim()) {
    const parsed = parsePositiveQuantity(form.prepTimeMinutes);
    if (parsed === null) errors.prepTimeMinutes = 'Upiši broj minuta.';
    else prepTimeMinutes = Math.round(parsed);
  }

  const ingredients: CreateRecipeInput['ingredients'] = [];
  form.ingredients.forEach((item, index) => {
    const named = hasName(item);
    if (!named && !item.quantity.trim()) return;
    if (!named) {
      errors.ingredientRows[index] = 'Dodaj naziv namirnice.';
      return;
    }
    const quantity = parsePositiveQuantity(item.quantity);
    if (quantity === null) {
      errors.ingredientRows[index] = 'Količina mora biti veća od 0.';
      return;
    }
    ingredients.push({
      id: item.id,
      rawName: item.rawName,
      ingredientId: item.ingredientId,
      sourceName: item.sourceName,
      linkToIngredientId: item.linkToIngredientId,
      quantity,
      unit: item.unit,
      notes: item.notes,
    });
  });
  if (ingredients.length === 0 && Object.keys(errors.ingredientRows).length === 0) {
    errors.ingredients = 'Dodaj bar jedan sastojak.';
  }

  const valid =
    !errors.name &&
    !errors.baseServings &&
    !errors.prepTimeMinutes &&
    !errors.ingredients &&
    Object.keys(errors.ingredientRows).length === 0;
  if (!valid || baseServings === null) return { input: null, errors };

  return {
    input: {
      name,
      description: form.description,
      baseServings,
      prepTimeMinutes,
      mealTypes: form.mealTypes,
      dishType: form.dishType || null,
      steps: form.steps
        .split('\n')
        .map((step) => step.trim())
        .filter(Boolean),
      notes: form.notes,
      ingredients,
    },
    errors,
  };
}
