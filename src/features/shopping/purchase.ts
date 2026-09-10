import {
  shoppingItemRepository,
  pantryItemRepository,
  ingredientRepository,
} from '@/services/repositories';
import { convertQuantity, type Unit } from '@/constants/units';
import { nowISO } from '@/database/repository';
import { ensurePantryPresence } from '@/features/pantry/ensure';
import { presenceQuantity, tracksPresence } from '@/features/pantry/presence';
import type { PantryItem, ShoppingItem } from '@/types';

export function addPurchasedQuantity(
  pantry: PantryItem,
  quantity: number,
  unit: Unit
): PantryItem {
  if (pantry.unit === unit) {
    return { ...pantry, quantity: pantry.quantity + quantity };
  }
  const converted = convertQuantity(quantity, unit, pantry.unit);
  if (converted !== null) {
    return { ...pantry, quantity: pantry.quantity + converted };
  }
  if (pantry.quantity <= 0) {
    return { ...pantry, quantity, unit };
  }
  return { ...pantry, quantity: pantry.quantity + quantity };
}

export async function purchaseCheckedItems(items: ShoppingItem[]): Promise<void> {
  const checked = items.filter((item) => item.isChecked);
  if (checked.length === 0) return;

  const ingredients = await ingredientRepository.findAll();
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  const now = nowISO();

  for (const item of checked) {
    if (item.ingredientId) {
      const pantryItem = await ensurePantryPresence(item.ingredientId, item.unit);
      const ingredient = byId.get(item.ingredientId);
      const updated = tracksPresence(ingredient)
        ? { ...pantryItem, quantity: presenceQuantity(true), updatedAt: now }
        : { ...addPurchasedQuantity(pantryItem, item.quantity, item.unit), updatedAt: now };
      await pantryItemRepository.update(updated);
    }
    await shoppingItemRepository.delete(item.id);
  }
}
