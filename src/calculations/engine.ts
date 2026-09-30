import { convertQuantity, isUnitCompatible, unitTypeMap, type Unit } from '@/constants/units';
import { categoryToStoreSection } from '@/constants/categories';
import { canonicalIngredientName, ingredientNameKey } from '@/lib/ingredientNames';
import type { Ingredient, Meal, PantryItem, Recipe, RecipeIngredient, UUID } from '@/types';

export interface CalculationInput {
  ingredients: Ingredient[];
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  meals: Meal[];
  pantryItems: PantryItem[];
}

export interface MealBreakdown {
  mealId: UUID;
  quantity: number;
  unit: Unit;
}

export interface CalculationResult {
  /** Unique per ingredient and unit family; one ingredient may need both grams and pieces. */
  key: string;
  ingredientId: UUID;
  ingredientName: string;
  category: string;
  requiredQuantity: number;
  requiredUnit: Unit;
  availableQuantity: number;
  availableUnit: Unit;
  missingQuantity: number;
  missingUnit: Unit;
  isMissing: boolean;
  trackPresence: boolean;
  meals: MealBreakdown[];
}

export interface ShoppingListItem {
  ingredientId: UUID | null;
  name: string;
  category: string;
  quantity: number;
  unit: Unit;
  sourceMealIds: UUID[];
}

export interface CalculationOutput {
  byIngredient: CalculationResult[];
  missing: CalculationResult[];
  shoppingList: ShoppingListItem[];
}

interface AggregatedRequirement {
  ingredientId: UUID;
  unit: Unit;
  quantity: number;
  meals: MealBreakdown[];
}

function representativeIngredient(
  ingredients: Ingredient[],
  ingredientId: UUID
): Ingredient | undefined {
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  const current = byId.get(ingredientId);
  if (!current) return undefined;
  const key = ingredientNameKey(current.name);
  const group = ingredients.filter((item) => ingredientNameKey(item.name) === key);
  const canonical = canonicalIngredientName(current.name);
  return group.find((item) => item.name === canonical) ?? group[0] ?? current;
}

function memberIdsFor(ingredients: Ingredient[], representative: Ingredient): Set<UUID> {
  const key = ingredientNameKey(representative.name);
  return new Set(
    ingredients.filter((item) => ingredientNameKey(item.name) === key).map((item) => item.id)
  );
}

export function calculate(input: CalculationInput): CalculationOutput {
  const recipeById = new Map(input.recipes.map((r) => [r.id, r]));
  const ingredientById = new Map(input.ingredients.map((i) => [i.id, i]));

  const requiredByUnit = new Map<UUID, AggregatedRequirement[]>();

  for (const meal of input.meals) {
    if (meal.isCooked) continue;
    const recipe = recipeById.get(meal.recipeId);
    if (!recipe) continue;

    const recipeIngredients = input.recipeIngredients.filter(
      (ri) => ri.recipeId === recipe.id
    );

    for (const ri of recipeIngredients) {
      const representative = representativeIngredient(input.ingredients, ri.ingredientId);
      if (!representative) continue;

      const scaled = scaleQuantity(ri.quantity, recipe.baseServings, meal.servings);
      const breakdown: MealBreakdown = {
        mealId: meal.id,
        quantity: scaled,
        unit: ri.unit,
      };

      const list = requiredByUnit.get(representative.id) ?? [];
      const existing = list.find((r) => r.unit === ri.unit);
      if (existing) {
        existing.quantity += scaled;
        existing.meals.push(breakdown);
      } else {
        list.push({
          ingredientId: representative.id,
          unit: ri.unit,
          quantity: scaled,
          meals: [breakdown],
        });
      }
      requiredByUnit.set(representative.id, list);
    }
  }

  const results: CalculationResult[] = [];

  for (const [ingredientId, requirements] of requiredByUnit.entries()) {
    const ingredient = ingredientById.get(ingredientId);
    if (!ingredient) continue;

    const ids = memberIdsFor(input.ingredients, ingredient);
    const pantryForIngredient = input.pantryItems.filter((p) => ids.has(p.ingredientId));
    const presenceTracked = input.ingredients.some(
      (item) => ids.has(item.id) && item.trackPresence
    );
    const buckets = presenceTracked
      ? [requirements]
      : Array.from(groupBy(requirements, (r) => unitBucket(r.unit)).values());

    for (const bucket of buckets) {
      const canonicalUnit = chooseCanonicalUnit(
        bucket.map((r) => r.unit),
        ingredient.defaultUnit
      );
      const requiredQuantity = sumConvertible(bucket, canonicalUnit);
      const availableQuantity = sumPantry(pantryForIngredient, canonicalUnit);
      let missingQuantity = Math.max(0, requiredQuantity - availableQuantity);
      let isMissing = missingQuantity > 0;
      if (presenceTracked) {
        const inStock = pantryForIngredient.some((p) => p.quantity > 0);
        missingQuantity = inStock ? 0 : requiredQuantity > 0 ? requiredQuantity : 1;
        isMissing = !inStock;
      }

      const mealBreakdown: MealBreakdown[] = [];
      for (const req of bucket) {
        for (const meal of req.meals) {
          const converted = convertQuantity(meal.quantity, meal.unit, canonicalUnit);
          mealBreakdown.push({
            mealId: meal.mealId,
            quantity: converted ?? meal.quantity,
            unit: converted !== null ? canonicalUnit : meal.unit,
          });
        }
      }

      results.push({
        key: presenceTracked ? ingredientId : `${ingredientId}:${unitBucket(canonicalUnit)}`,
        ingredientId,
        ingredientName: canonicalIngredientName(ingredient.name),
        category: ingredient.category,
        requiredQuantity,
        requiredUnit: canonicalUnit,
        availableQuantity,
        availableUnit: canonicalUnit,
        missingQuantity,
        missingUnit: canonicalUnit,
        isMissing,
        trackPresence: presenceTracked,
        meals: mealBreakdown,
      });
    }
  }

  const seenPresenceKeys = new Set(
    results.map((result) => {
      const current = ingredientById.get(result.ingredientId);
      return current ? ingredientNameKey(current.name) : result.ingredientId;
    })
  );

  for (const ingredient of input.ingredients) {
    if (!ingredient.trackPresence) continue;
    const representative = representativeIngredient(input.ingredients, ingredient.id);
    if (!representative) continue;
    const key = ingredientNameKey(representative.name);
    if (seenPresenceKeys.has(key)) continue;

    const ids = memberIdsFor(input.ingredients, representative);
    const availableQuantity = sumPantry(
      input.pantryItems.filter((p) => ids.has(p.ingredientId)),
      representative.defaultUnit
    );
    seenPresenceKeys.add(key);
    if (availableQuantity > 0) continue;

    results.push({
      key: representative.id,
      ingredientId: representative.id,
      ingredientName: canonicalIngredientName(representative.name),
      category: representative.category,
      requiredQuantity: 0,
      requiredUnit: representative.defaultUnit,
      availableQuantity: 0,
      availableUnit: representative.defaultUnit,
      missingQuantity: 1,
      missingUnit: representative.defaultUnit,
      isMissing: true,
      trackPresence: true,
      meals: [],
    });
  }

  const missing = results.filter((r) => r.isMissing);
  const shoppingList = buildShoppingList(missing, ingredientById);

  return {
    byIngredient: results,
    missing,
    shoppingList,
  };
}

export function scaleQuantity(
  baseQuantity: number,
  baseServings: number,
  targetServings: number
): number {
  if (baseServings <= 0) return baseQuantity;
  return (baseQuantity * targetServings) / baseServings;
}

/** Units in the same bucket convert into each other; count units never convert. */
export function unitBucket(unit: Unit): string {
  const family = unitTypeMap[unit];
  return family === 'count' ? unit : family;
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function chooseCanonicalUnit(units: Unit[], defaultUnit: Unit): Unit {
  const unique = Array.from(new Set(units));
  if (unique.length === 1) return unique[0];

  // Prefer the ingredient's default unit if all required units are compatible.
  if (unique.every((u) => isUnitCompatible(u, defaultUnit))) {
    return defaultUnit;
  }

  const families = new Set(unique.map((u) => unitTypeMap[u]));

  if (families.size === 1) {
    const family = unitTypeMap[unique[0]];
    if (family === 'weight') return 'g';
    if (family === 'volume') return 'ml';
  }

  // Most frequent unit as fallback.
  const counts = new Map<Unit, number>();
  for (const unit of units) {
    counts.set(unit, (counts.get(unit) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? units[0];
}

function sumConvertible(
  items: { unit: Unit; quantity: number }[],
  targetUnit: Unit
): number {
  let total = 0;
  for (const item of items) {
    if (item.unit === targetUnit) {
      total += item.quantity;
    } else {
      const converted = convertQuantity(item.quantity, item.unit, targetUnit);
      if (converted !== null) total += converted;
    }
  }
  return total;
}

function sumPantry(pantryItems: PantryItem[], targetUnit: Unit): number {
  let total = 0;
  for (const item of pantryItems) {
    if (item.unit === targetUnit) {
      total += item.quantity;
    } else {
      const converted = convertQuantity(item.quantity, item.unit, targetUnit);
      if (converted !== null) {
        total += converted;
      }
    }
  }
  return total;
}

function buildShoppingList(
  missing: CalculationResult[],
  ingredientById: Map<UUID, Ingredient>
): ShoppingListItem[] {
  return missing.map((item) => {
    const ingredient = ingredientById.get(item.ingredientId);
    return {
      ingredientId: item.ingredientId,
      name: canonicalIngredientName(ingredient?.name ?? item.ingredientName),
      category: categoryToStoreSection(
        (ingredient?.category ?? 'Ostalo') as Ingredient['category']
      ),
      quantity: item.missingQuantity,
      unit: item.missingUnit,
      sourceMealIds: Array.from(new Set(item.meals.map((m) => m.mealId))),
    };
  });
}

