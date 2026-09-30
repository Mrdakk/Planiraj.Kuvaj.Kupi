import {
  shoppingItemRepository,
  pantryItemRepository,
  ingredientRepository,
} from '@/services/repositories';
import { convertQuantity, type Unit } from '@/constants/units';
import { nowISO } from '@/database/repository';
import { ensurePantryPresence } from '@/features/pantry/ensure';
import { presenceQuantity, tracksPresence } from '@/features/pantry/presence';
import { resolveOrCreateIngredient } from '@/features/recipes/service';
import type { PantryItem, ShoppingItem } from '@/types';

/**
 * Adds a purchase onto a kitchen row. `ensurePantryPresence` only hands out rows
 * whose unit converts or that are empty, so amounts never mix across units.
 */
export function addPurchasedQuantity(
  pantry: PantryItem,
  quantity: number,
  unit: Unit
): PantryItem {
  const converted = convertQuantity(quantity, unit, pantry.unit);
  if (converted !== null) {
    return { ...pantry, quantity: pantry.quantity + converted };
  }
  return { ...pantry, quantity, unit };
}

async function ingredientIdFor(item: ShoppingItem): Promise<string> {
  if (item.ingredientId) return item.ingredientId;
  const resolved = await resolveOrCreateIngredient(item.name, item.unit, 'Ostalo');
  return resolved.ingredient.id;
}

export async function purchaseCheckedItems(items: ShoppingItem[]): Promise<void> {
  const checked = items.filter((item) => item.isChecked);
  if (checked.length === 0) return;

  const now = nowISO();

  for (const item of checked) {
    if (item.name.trim() || item.ingredientId) {
      const ingredientId = await ingredientIdFor(item);
      const pantryItem = await ensurePantryPresence(ingredientId, item.unit);
      const ingredient = await ingredientRepository.findById(ingredientId);
      const updated = tracksPresence(ingredient)
        ? { ...pantryItem, quantity: presenceQuantity(true), updatedAt: now }
        : { ...addPurchasedQuantity(pantryItem, item.quantity, item.unit), updatedAt: now };
      await pantryItemRepository.update(updated);
    }
    await shoppingItemRepository.delete(item.id);
  }
}
