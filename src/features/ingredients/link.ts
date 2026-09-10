import {
  consumptionLogRepository,
  ingredientAliasRepository,
  ingredientRepository,
  pantryItemRepository,
  recipeIngredientRepository,
  shoppingItemRepository,
} from '@/services/repositories';
import { generateUUID } from '@/lib/uuid';
import { nowISO } from '@/database/repository';
import { convertQuantity, isUnitCompatible } from '@/constants/units';
import { displayIngredientName } from '@/lib/ingredientNames';
import type { Ingredient, PantryItem } from '@/types';

export function linkableIngredients(
  current: Pick<PantryItem, 'ingredientId' | 'unit'>,
  pantryItems: PantryItem[],
  ingredients: Ingredient[]
): Ingredient[] {
  const byId = new Map(ingredients.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const list: Ingredient[] = [];
  for (const row of pantryItems) {
    if (row.ingredientId === current.ingredientId || seen.has(row.ingredientId)) continue;
    if (!isUnitCompatible(row.unit, current.unit)) continue;
    seen.add(row.ingredientId);
    const other = byId.get(row.ingredientId);
    if (other) list.push(other);
  }
  return list.sort((a, b) =>
    displayIngredientName(a.name).localeCompare(displayIngredientName(b.name), 'sr', {
      sensitivity: 'base',
    })
  );
}

export async function ensureAlias(ingredientId: string, alias: string): Promise<void> {
  const trimmed = alias.trim().toLowerCase();
  if (!trimmed) return;
  const existing = await ingredientAliasRepository.findManyWhere(
    'ingredient_id = ? AND alias = ?',
    [ingredientId, trimmed]
  );
  if (existing.length > 0) return;
  const now = nowISO();
  await ingredientAliasRepository.insert({
    id: generateUUID(),
    ingredientId,
    alias: trimmed,
    createdAt: now,
    updatedAt: now,
  });
}

export async function linkIngredients(absorbId: string, keepId: string): Promise<void> {
  if (absorbId === keepId) return;

  const absorb = await ingredientRepository.findById(absorbId);
  const keep = await ingredientRepository.findById(keepId);
  if (!absorb || !keep) {
    throw new Error('Namirnica nije pronađena');
  }

  const now = nowISO();
  const keepName = displayIngredientName(keep.name);

  const recipeRows = await recipeIngredientRepository.findManyWhere('ingredient_id = ?', [absorbId]);
  for (const row of recipeRows) {
    await recipeIngredientRepository.update({ ...row, ingredientId: keepId, updatedAt: now });
  }

  const pantryFrom = await pantryItemRepository.findManyWhere('ingredient_id = ?', [absorbId]);
  const pantryTo = await pantryItemRepository.findManyWhere('ingredient_id = ?', [keepId]);
  for (const item of pantryFrom) {
    const match = pantryTo.find(
      (row) => row.unit === item.unit || isUnitCompatible(row.unit, item.unit)
    );
    const converted = match ? convertQuantity(item.quantity, item.unit, match.unit) : null;
    if (match && converted !== null) {
      await pantryItemRepository.update({
        ...match,
        quantity: match.quantity + converted,
        updatedAt: now,
      });
      await pantryItemRepository.delete(item.id);
    } else {
      await pantryItemRepository.update({ ...item, ingredientId: keepId, updatedAt: now });
      pantryTo.push({ ...item, ingredientId: keepId });
    }
  }

  const shoppingRows = await shoppingItemRepository.findManyWhere('ingredient_id = ?', [absorbId]);
  for (const row of shoppingRows) {
    await shoppingItemRepository.update({
      ...row,
      ingredientId: keepId,
      name: keepName,
      updatedAt: now,
    });
  }

  const logRows = await consumptionLogRepository.findManyWhere('ingredient_id = ?', [absorbId]);
  for (const row of logRows) {
    await consumptionLogRepository.update({ ...row, ingredientId: keepId, updatedAt: now });
  }

  const absorbAliases = await ingredientAliasRepository.findManyWhere('ingredient_id = ?', [
    absorbId,
  ]);
  for (const alias of absorbAliases) {
    await ingredientAliasRepository.update({ ...alias, ingredientId: keepId, updatedAt: now });
  }

  await ensureAlias(keepId, absorb.name);
  await ingredientRepository.delete(absorbId);
}
