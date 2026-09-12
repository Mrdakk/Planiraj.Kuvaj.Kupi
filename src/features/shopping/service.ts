import {
  shoppingListRepository,
  shoppingItemRepository,
  mealPlanRepository,
  mealRepository,
  recipeRepository,
  recipeIngredientRepository,
  pantryItemRepository,
  ingredientRepository,
} from '@/services/repositories';
import { calculate } from '@/calculations/engine';
import { generateUUID } from '@/lib/uuid';
import { nowISO } from '@/database/repository';
import { formatDisplayDate } from '@/lib/dates';
import type { ShoppingItem, ShoppingList } from '@/types';
import type { Unit } from '@/constants/units';
import type { GroceryStoreSection } from '@/constants/categories';
import type {
  ShoppingAddConflict,
  ShoppingAddLine,
  ShoppingAddPreview,
  ShoppingConflictMode,
} from './types';

export type {
  ShoppingAddConflict,
  ShoppingAddLine,
  ShoppingAddPreview,
  ShoppingConflictMode,
};

function itemMatchKey(ingredientId: string, unit: Unit): string {
  return `${ingredientId}:${unit}`;
}

function mergeSourceMealIds(current: string[], incoming: string[]): string[] {
  return Array.from(new Set([...current, ...incoming]));
}

export async function ensureShoppingList(weekStart: string): Promise<ShoppingList> {
  const existing = await shoppingListRepository.findManyWhere('week_start = ?', [weekStart]);
  if (existing.length > 0) return existing[0];

  const list: ShoppingList = {
    id: generateUUID(),
    weekStart,
    name: `Lista za ${formatDisplayDate(weekStart)}`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await shoppingListRepository.insert(list);
  return list;
}

export async function generateShoppingList(weekStart: string): Promise<ShoppingList> {
  const list = await ensureShoppingList(weekStart);

  const plans = await mealPlanRepository.findManyWhere('week_start = ?', [weekStart]);
  const plan = plans[0] ?? null;

  const [meals, recipes, recipeIngredients, pantryItems, ingredients] = await Promise.all([
    plan ? mealRepository.findManyWhere('meal_plan_id = ?', [plan.id]) : [],
    recipeRepository.findAll(),
    recipeIngredientRepository.findAll(),
    pantryItemRepository.findAll(),
    ingredientRepository.findAll(),
  ]);

  const calculation = calculate({
    ingredients,
    recipes,
    recipeIngredients,
    meals,
    pantryItems,
  });

  // Remove existing non-manual items for this list.
  const existingItems = await shoppingItemRepository.findManyWhere(
    'shopping_list_id = ? AND is_manual = 0',
    [list.id]
  );
  for (const item of existingItems) {
    await shoppingItemRepository.delete(item.id);
  }

  const unique = new Map<string, (typeof calculation.shoppingList)[number]>();
  for (const item of calculation.shoppingList) {
    const key = `${item.ingredientId ?? item.name.toLowerCase()}:${item.unit}`;
    const existing = unique.get(key);
    if (existing) {
      unique.set(key, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        sourceMealIds: Array.from(new Set([...existing.sourceMealIds, ...item.sourceMealIds])),
      });
    } else {
      unique.set(key, item);
    }
  }

  for (const item of unique.values()) {
    const shoppingItem: ShoppingItem = {
      id: generateUUID(),
      shoppingListId: list.id,
      ingredientId: item.ingredientId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category as GroceryStoreSection,
      isChecked: false,
      isManual: false,
      sourceMealIds: item.sourceMealIds,
      notes: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    await shoppingItemRepository.insert(shoppingItem);
  }

  return list;
}

export async function addManualShoppingItem(
  listId: string,
  name: string,
  quantity: number,
  unit: Unit,
  category: GroceryStoreSection
): Promise<ShoppingItem> {
  const item: ShoppingItem = {
    id: generateUUID(),
    shoppingListId: listId,
    ingredientId: null,
    name: name.trim(),
    quantity,
    unit,
    category,
    isChecked: false,
    isManual: true,
    sourceMealIds: [],
    notes: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await shoppingItemRepository.insert(item);
  return item;
}

export async function previewAddToShopping(
  weekStart: string,
  lines: ShoppingAddLine[]
): Promise<ShoppingAddPreview> {
  const list = await ensureShoppingList(weekStart);
  const existingItems = await shoppingItemRepository.findManyWhere('shopping_list_id = ?', [list.id]);
  const existingByKey = new Map<string, ShoppingItem>();
  for (const item of existingItems) {
    if (!item.ingredientId) continue;
    const key = itemMatchKey(item.ingredientId, item.unit);
    if (!existingByKey.has(key)) existingByKey.set(key, item);
  }

  const newLines: ShoppingAddLine[] = [];
  const conflicts: ShoppingAddConflict[] = [];
  for (const line of lines) {
    const existing = existingByKey.get(itemMatchKey(line.ingredientId, line.unit));
    if (existing) {
      conflicts.push({ line, existing });
    } else {
      newLines.push(line);
    }
  }

  return { list, newLines, conflicts };
}

export async function applyAddToShopping(
  listId: string,
  lines: ShoppingAddLine[],
  conflictMode: ShoppingConflictMode
): Promise<void> {
  const existingItems = await shoppingItemRepository.findManyWhere('shopping_list_id = ?', [listId]);
  const existingByKey = new Map<string, ShoppingItem>();
  for (const item of existingItems) {
    if (!item.ingredientId) continue;
    const key = itemMatchKey(item.ingredientId, item.unit);
    if (!existingByKey.has(key)) existingByKey.set(key, item);
  }

  const now = nowISO();
  for (const line of lines) {
    const key = itemMatchKey(line.ingredientId, line.unit);
    const existing = existingByKey.get(key);
    if (existing && conflictMode === 'merge') {
      const updated: ShoppingItem = {
        ...existing,
        quantity: existing.quantity + line.quantity,
        sourceMealIds: mergeSourceMealIds(existing.sourceMealIds, line.sourceMealIds),
        updatedAt: now,
      };
      await shoppingItemRepository.update(updated);
      existingByKey.set(key, updated);
      continue;
    }

    const shoppingItem: ShoppingItem = {
      id: generateUUID(),
      shoppingListId: listId,
      ingredientId: line.ingredientId,
      name: line.name,
      quantity: line.quantity,
      unit: line.unit,
      category: line.category,
      isChecked: false,
      isManual: false,
      sourceMealIds: line.sourceMealIds,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    await shoppingItemRepository.insert(shoppingItem);
    if (!existing) {
      existingByKey.set(key, shoppingItem);
    }
  }
}

export function checkedShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
  return items.filter((item) => item.isChecked);
}

export async function updateShoppingItemDetails(
  item: ShoppingItem,
  quantity: number,
  unit: Unit
): Promise<ShoppingItem> {
  const updated: ShoppingItem = {
    ...item,
    quantity,
    unit,
    updatedAt: nowISO(),
  };
  await shoppingItemRepository.update(updated);
  return updated;
}

export async function toggleShoppingItemChecked(item: ShoppingItem): Promise<ShoppingItem> {
  const updated: ShoppingItem = { ...item, isChecked: !item.isChecked, updatedAt: nowISO() };
  await shoppingItemRepository.update(updated);
  return updated;
}
