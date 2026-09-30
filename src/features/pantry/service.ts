import { pantryItemRepository, ingredientRepository } from '@/services/repositories';
import { resolveOrCreateIngredient } from '@/features/recipes/service';
import { generateUUID } from '@/lib/uuid';
import { nowISO } from '@/database/repository';
import { parseISODate } from '@/lib/dates';
import { displayIngredientName } from '@/lib/ingredientNames';
import { presenceQuantity } from '@/features/pantry/presence';
import type { PantryItem } from '@/types';
import type { Unit } from '@/constants/units';
import type { IngredientCategory } from '@/constants/categories';

export class DuplicateKitchenItemError extends Error {
  constructor(name: string) {
    super(`${name} već postoji u kuhinji.`);
    this.name = 'DuplicateKitchenItemError';
  }
}

export interface CreatePantryItemInput {
  rawName: string;
  quantity: number;
  unit: Unit;
  category?: IngredientCategory;
  expiresAt?: string;
  notes?: string;
  trackPresence?: boolean;
  inStock?: boolean;
}

export async function addPantryItem(input: CreatePantryItemInput): Promise<PantryItem> {
  const ingredient = await resolveOrCreateIngredient(
    input.rawName,
    input.unit,
    input.category ?? 'Ostalo'
  );

  const existing = await pantryItemRepository.findManyWhere('ingredient_id = ?', [
    ingredient.ingredient.id,
  ]);
  if (existing.length > 0) {
    throw new DuplicateKitchenItemError(displayIngredientName(ingredient.ingredient.name));
  }

  let resolved = ingredient.ingredient;
  if (input.trackPresence && !resolved.trackPresence) {
    resolved = { ...resolved, trackPresence: true, updatedAt: nowISO() };
    await ingredientRepository.update(resolved);
  }

  const quantity = resolved.trackPresence
    ? presenceQuantity(input.inStock !== false)
    : input.quantity;

  const item: PantryItem = {
    id: generateUUID(),
    ingredientId: resolved.id,
    quantity,
    unit: input.unit,
    expiresAt: input.expiresAt ?? null,
    notes: input.notes?.trim() ?? null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  await pantryItemRepository.insert(item);
  return item;
}

export function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const expiry = parseISODate(expiresAt);
  if (!expiry) return null;
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function expiryLabel(expiresAt: string | null): string | null {
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return null;
  if (days < 0) return `Isteklo pre ${Math.abs(days)} dana`;
  if (days === 0) return 'Ističe danas';
  if (days === 1) return 'Ističe za 1 dan';
  return `Ističe za ${days} dana`;
}
