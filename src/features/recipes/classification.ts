import {
  dishTypes,
  isDishType,
  isMealType,
  mealTypes,
  type DishType,
  type MealType,
} from '@/constants/categories';
import { formatServings } from '@/lib/formatServings';

export interface RecipeClassification {
  mealTypes: MealType[];
  dishType: DishType | null;
}

const LEGACY_MEAL_SLOTS: Record<string, MealType> = {
  doručak: 'Doručak',
  užina: 'Užina',
  ručak: 'Ručak',
  večera: 'Večera',
  desert: 'Desert',
};

export function normalizeMealTypes(values: readonly string[]): MealType[] {
  const selected = new Set(values.filter(isMealType));
  return mealTypes.filter((type) => selected.has(type));
}

export function parseMealTypesJson(raw: string | null | undefined): MealType[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeMealTypes(parsed.map((item) => String(item)));
  } catch {
    return [];
  }
}

export function classifyLegacyRecipeCategory(
  category: string | null | undefined
): RecipeClassification {
  const label = category?.trim() ?? '';
  if (!label) return { mealTypes: [], dishType: null };

  if (label === 'Glavno jelo') {
    return { mealTypes: ['Ručak', 'Večera'], dishType: 'Glavno jelo' };
  }

  const slot = LEGACY_MEAL_SLOTS[label.toLowerCase()];
  if (slot === 'Desert') {
    return { mealTypes: ['Desert'], dishType: 'Slatko' };
  }
  if (slot) {
    return { mealTypes: [slot], dishType: null };
  }

  if (isDishType(label)) {
    return { mealTypes: [], dishType: label };
  }

  return { mealTypes: [], dishType: null };
}

export function classifyImportedCategory(
  category: string | null | undefined
): RecipeClassification {
  const classified = classifyLegacyRecipeCategory(category);
  if (classified.mealTypes.length === 0) {
    return { ...classified, mealTypes: ['Ručak'] };
  }
  return classified;
}

export function recipeHasMealType(
  recipe: { mealTypes?: readonly MealType[] },
  mealType: MealType
): boolean {
  return (recipe.mealTypes ?? []).includes(mealType);
}

export function mealTypeRank(recipe: { mealTypes?: readonly MealType[] }): number {
  const index = mealTypes.findIndex((type) => recipeHasMealType(recipe, type));
  return index === -1 ? mealTypes.length : index;
}

export function recipeListSubtitle(recipe: {
  dishType?: string | null;
  baseServings: number;
}): string {
  const servings = formatServings(recipe.baseServings);
  return recipe.dishType ? `${recipe.dishType} · ${servings}` : servings;
}

export { dishTypes };
