import {
  pantryItemRepository,
  recipeIngredientRepository,
  ingredientRepository,
} from '@/services/repositories';
import { generateUUID } from '@/lib/uuid';
import { nowISO } from '@/database/repository';
import { presenceQuantity, tracksPresence } from '@/features/pantry/presence';
import type { PantryItem } from '@/types';
import type { Unit } from '@/constants/units';

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

export async function ensurePantryPresence(
  ingredientId: string,
  unit: Unit
): Promise<PantryItem> {
  const existing = await pantryItemRepository.findManyWhere('ingredient_id = ?', [ingredientId]);
  if (existing.length > 0) return existing[0];

  const ingredient = await ingredientRepository.findById(ingredientId);
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
