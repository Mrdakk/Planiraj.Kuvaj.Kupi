import type { CalculationResult } from '@/calculations/engine';
import {
  categoryToStoreSection,
  type GroceryStoreSection,
  type IngredientCategory,
} from '@/constants/categories';
import type { ShoppingAddLine } from '@/features/shopping/types';
import type { DayRecipeGroup, MissingDayGroup } from './groupByDay';

export type SelectionHeaderState = 'all' | 'none' | 'some';

/** `rowKey` is the calculation result key (ingredient plus unit family). */
export function byDayItemKey(date: string, recipeId: string, rowKey: string): string {
  return `${date}|${recipeId}|${rowKey}`;
}

export function allTogetherItemKey(rowKey: string): string {
  return `all|${rowKey}`;
}

export function keysForRecipe(date: string, recipe: DayRecipeGroup): string[] {
  return recipe.items.map((item) => byDayItemKey(date, recipe.recipeId, item.key));
}

export function keysForDay(group: MissingDayGroup): string[] {
  return group.recipes.flatMap((recipe) => keysForRecipe(group.date, recipe));
}

export function toggleSelectionKey(selected: Set<string>, key: string): Set<string> {
  const next = new Set(selected);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export function toggleSelectionKeys(selected: Set<string>, keys: string[]): Set<string> {
  const next = new Set(selected);
  const allSelected = keys.length > 0 && keys.every((key) => next.has(key));
  if (allSelected) {
    for (const key of keys) next.delete(key);
  } else {
    for (const key of keys) next.add(key);
  }
  return next;
}

export function selectionHeaderState(selected: Set<string>, keys: string[]): SelectionHeaderState {
  if (keys.length === 0) return 'none';
  const count = keys.filter((key) => selected.has(key)).length;
  if (count === 0) return 'none';
  if (count === keys.length) return 'all';
  return 'some';
}

function storeSection(category: string): GroceryStoreSection {
  return categoryToStoreSection(category as IngredientCategory);
}

function mergeLines(lines: ShoppingAddLine[]): ShoppingAddLine[] {
  const merged = new Map<string, ShoppingAddLine>();
  for (const line of lines) {
    const key = `${line.ingredientId}:${line.unit}`;
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, {
        ...existing,
        quantity: existing.quantity + line.quantity,
        sourceMealIds: Array.from(new Set([...existing.sourceMealIds, ...line.sourceMealIds])),
      });
    } else {
      merged.set(key, { ...line, sourceMealIds: [...line.sourceMealIds] });
    }
  }
  return Array.from(merged.values());
}

export function collectByDayLines(
  selected: Set<string>,
  groups: MissingDayGroup[]
): ShoppingAddLine[] {
  const lines: ShoppingAddLine[] = [];
  for (const group of groups) {
    for (const recipe of group.recipes) {
      for (const item of recipe.items) {
        if (!selected.has(byDayItemKey(group.date, recipe.recipeId, item.key))) continue;
        lines.push({
          ingredientId: item.ingredientId,
          name: item.ingredientName,
          quantity: item.quantity,
          unit: item.unit,
          category: storeSection(item.category),
          sourceMealIds: recipe.mealIds,
        });
      }
    }
  }
  return mergeLines(lines);
}

export function collectAllTogetherLines(
  selected: Set<string>,
  missing: CalculationResult[]
): ShoppingAddLine[] {
  const lines: ShoppingAddLine[] = [];
  for (const item of missing) {
    if (!selected.has(allTogetherItemKey(item.key))) continue;
    lines.push({
      ingredientId: item.ingredientId,
      name: item.ingredientName,
      quantity: item.missingQuantity,
      unit: item.missingUnit,
      category: storeSection(item.category),
      sourceMealIds: item.meals.map((meal) => meal.mealId),
    });
  }
  return mergeLines(lines);
}
