import {
  pantryItemRepository,
  recipeIngredientRepository,
  ingredientRepository,
} from '@/services/repositories';
import { generateUUID } from '@/lib/uuid';
import { nowISO } from '@/database/repository';
import { presenceQuantity, tracksPresence } from '@/features/pantry/presence';
import type { PantryItem } from '@/types';
import { isUnitCompatible, type Unit } from '@/constants/units';

function pantryItemFor(ingredientId: string, unit: Unit, quantity: number): PantryItem {
  const now = nowISO();
  return {
    id: generateUUID(),
    ingredientId,
    quantity,
    unit,
    expiresAt: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Kitchen row that can take `unit`: one with a convertible unit, else an empty
 * one, else a new row. Presence-tracked ingredients always reuse their row.
 */
export async function ensurePantryPresence(
  ingredientId: string,
  unit: Unit
): Promise<PantryItem> {
  const existing = await pantryItemRepository.findManyWhere('ingredient_id = ?', [ingredientId]);
  const ingredient = await ingredientRepository.findById(ingredientId);
  const reusable =
    existing.find((item) => isUnitCompatible(item.unit, unit)) ??
    existing.find((item) => item.quantity <= 0) ??
    (tracksPresence(ingredient) ? existing[0] : undefined);
  if (reusable) return reusable;

  const item = pantryItemFor(
    ingredientId,
    unit,
    presenceQuantity(tracksPresence(ingredient))
  );
  await pantryItemRepository.insert(item);
  return item;
}

export async function ensureKitchenItemsFromRecipes(): Promise<void> {
  const [recipeRows, pantryItems, ingredients] = await Promise.all([
    recipeIngredientRepository.findAll(),
    pantryItemRepository.findAll(),
    ingredientRepository.findAll(),
  ]);
  const present = new Set(pantryItems.map((item) => item.ingredientId));
  const presenceIds = new Set(
    ingredients.filter((item) => item.trackPresence).map((item) => item.id)
  );

  for (const row of recipeRows) {
    if (present.has(row.ingredientId)) continue;
    const quantity = presenceQuantity(presenceIds.has(row.ingredientId));
    await pantryItemRepository.insert(pantryItemFor(row.ingredientId, row.unit, quantity));
    present.add(row.ingredientId);
  }
}
