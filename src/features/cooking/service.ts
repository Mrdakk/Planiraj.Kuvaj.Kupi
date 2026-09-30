import {
  mealRepository,
  recipeIngredientRepository,
  pantryItemRepository,
  consumptionLogRepository,
  ingredientRepository,
} from '@/services/repositories';
import { scaleQuantity } from '@/calculations/engine';
import { convertQuantity } from '@/constants/units';
import { nowISO } from '@/database/repository';
import { generateUUID } from '@/lib/uuid';
import { displayIngredientName } from '@/lib/ingredientNames';
import type { Meal, PantryItem, ConsumptionLog } from '@/types';

export { displayIngredientName };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveIngredientNames(
  ingredientIds: string[],
  hints?: Map<string, string>
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (const id of ingredientIds) {
    const hinted = hints?.get(id);
    if (hinted && !UUID_PATTERN.test(hinted.trim())) {
      names.set(id, displayIngredientName(hinted));
    }
  }

  const missing = ingredientIds.filter((id) => !names.has(id));
  if (missing.length === 0) {
    return names;
  }

  const allIngredients = await ingredientRepository.findAll();
  for (const ingredient of allIngredients) {
    if (!names.has(ingredient.id) && ingredient.name.trim()) {
      names.set(ingredient.id, displayIngredientName(ingredient.name));
    }
  }

  return names;
}

export interface ConsumptionPreviewItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  available: number;
  willConsume: number;
  trackPresence: boolean;
}

export interface ConsumptionPreview {
  items: ConsumptionPreviewItem[];
}

export async function buildConsumptionPreview(
  meal: Meal,
  recipeBaseServings: number,
  ingredientNames: Map<string, string>
): Promise<ConsumptionPreview> {
  const recipeIngredients = await recipeIngredientRepository.findManyWhere(
    'recipe_id = ?',
    [meal.recipeId]
  );
  const pantryItems = await pantryItemRepository.findAll();
  const allIngredients = await ingredientRepository.findAll();
  const names = await resolveIngredientNames(
    recipeIngredients.map((item) => item.ingredientId),
    ingredientNames
  );
  const presenceIds = new Set(
    allIngredients.filter((item) => item.trackPresence).map((item) => item.id)
  );

  const items: ConsumptionPreviewItem[] = [];
  for (const ri of recipeIngredients) {
    const quantity = scaleQuantity(ri.quantity, recipeBaseServings, meal.servings);
    const available = pantryItems
      .filter((p) => p.ingredientId === ri.ingredientId)
      .reduce((sum, p) => {
        if (p.unit === ri.unit) return sum + p.quantity;
        const converted = convertQuantity(p.quantity, p.unit, ri.unit);
        return converted !== null ? sum + converted : sum;
      }, 0);
    const trackPresence = presenceIds.has(ri.ingredientId);

    items.push({
      ingredientId: ri.ingredientId,
      ingredientName: displayIngredientName(names.get(ri.ingredientId)),
      quantity,
      unit: ri.unit,
      available,
      willConsume: trackPresence ? 0 : Math.min(quantity, available),
      trackPresence,
    });
  }

  return { items };
}

export interface ConsumeMealInput {
  meal: Meal;
  recipeBaseServings: number;
  overrides?: Map<string, number>; // ingredientId -> custom quantity to consume
  presenceStillHave?: Map<string, boolean>;
}

export async function consumeMeal(input: ConsumeMealInput): Promise<ConsumptionLog[]> {
  const { meal, recipeBaseServings, overrides, presenceStillHave } = input;
  if (meal.isCooked) {
    throw new Error('Obrok je već označen kao kuvano.');
  }
  const recipeIngredients = await recipeIngredientRepository.findManyWhere(
    'recipe_id = ?',
    [meal.recipeId]
  );
  const pantryItems = await pantryItemRepository.findAll();
  const allIngredients = await ingredientRepository.findAll();
  const presenceIds = new Set(
    allIngredients.filter((item) => item.trackPresence).map((item) => item.id)
  );
  const logs: ConsumptionLog[] = [];
  const now = nowISO();

  const updatedPantryItems: PantryItem[] = [];
  const updatedIds = new Set<string>();

  const writeLog = async (ingredientId: string, quantity: number, unit: ConsumptionLog['unit']) => {
    const log: ConsumptionLog = {
      id: generateUUID(),
      mealId: meal.id,
      ingredientId,
      quantity,
      unit,
      consumedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await consumptionLogRepository.insert(log);
    logs.push(log);
  };

  for (const ri of recipeIngredients) {
    if (presenceIds.has(ri.ingredientId)) {
      const stillHave = presenceStillHave?.get(ri.ingredientId);
      if (stillHave === undefined) continue;
      const matchingPantry = pantryItems.filter((p) => p.ingredientId === ri.ingredientId);
      if (matchingPantry.length === 0) {
        const created: PantryItem = {
          id: generateUUID(),
          ingredientId: ri.ingredientId,
          quantity: stillHave ? 1 : 0,
          unit: ri.unit as PantryItem['unit'],
          expiresAt: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        };
        await pantryItemRepository.insert(created);
        if (created.quantity > 0) {
          // Negative log: undo takes back the stock this cook added.
          await writeLog(ri.ingredientId, -created.quantity, created.unit);
        }
        continue;
      }
      for (const pantryItem of matchingPantry) {
        if (updatedIds.has(pantryItem.id)) continue;
        const nextQuantity = stillHave ? Math.max(pantryItem.quantity, 1) : 0;
        updatedPantryItems.push({ ...pantryItem, quantity: nextQuantity, updatedAt: now });
        updatedIds.add(pantryItem.id);
        const removed = pantryItem.quantity - nextQuantity;
        if (removed !== 0) {
          await writeLog(ri.ingredientId, removed, pantryItem.unit);
        }
      }
      continue;
    }

    const quantityToConsume = overrides?.get(ri.ingredientId) ?? scaleQuantity(ri.quantity, recipeBaseServings, meal.servings);
    const matchingPantry = pantryItems.filter((p) => p.ingredientId === ri.ingredientId);

    let remainingToConsume = quantityToConsume;
    let actuallyConsumed = 0;

    const sorted = matchingPantry.sort((a, b) => {
      if (!a.expiresAt && !b.expiresAt) return 0;
      if (!a.expiresAt) return 1;
      if (!b.expiresAt) return -1;
      return a.expiresAt.localeCompare(b.expiresAt);
    });

    for (const pantryItem of sorted) {
      if (remainingToConsume <= 0) break;

      const available = pantryItem.quantity;
      let consumeAmount = 0;

      if (pantryItem.unit === ri.unit) {
        consumeAmount = Math.min(available, remainingToConsume);
        updatedPantryItems.push({
          ...pantryItem,
          quantity: Math.max(0, available - consumeAmount),
          updatedAt: now,
        });
      } else {
        const convertedAvailable = convertQuantity(available, pantryItem.unit, ri.unit);
        if (convertedAvailable !== null) {
          const consumeConverted = Math.min(convertedAvailable, remainingToConsume);
          const consumeInPantryUnit = convertQuantity(consumeConverted, ri.unit, pantryItem.unit) ?? 0;
          consumeAmount = consumeConverted;
          updatedPantryItems.push({
            ...pantryItem,
            quantity: Math.max(0, available - consumeInPantryUnit),
            updatedAt: now,
          });
        }
      }

      remainingToConsume -= consumeAmount;
      actuallyConsumed += consumeAmount;
    }

    if (actuallyConsumed > 0) {
      await writeLog(ri.ingredientId, actuallyConsumed, ri.unit);
    }
  }

  for (const item of updatedPantryItems) {
    await pantryItemRepository.update(item);
  }

  await mealRepository.update({ ...meal, isCooked: true, updatedAt: now });
  return logs;
}

export async function unconsumeMeal(meal: Meal): Promise<void> {
  if (!meal.isCooked) {
    throw new Error('Obrok nije označen kao kuvano.');
  }

  const logs = await consumptionLogRepository.findManyWhere('meal_id = ?', [meal.id]);
  const pantryItems = await pantryItemRepository.findAll();
  const now = nowISO();

  const byIngredient = new Map<string, PantryItem[]>();
  for (const item of pantryItems) {
    const list = byIngredient.get(item.ingredientId) ?? [];
    list.push({ ...item });
    byIngredient.set(item.ingredientId, list);
  }

  const toUpdate = new Map<string, PantryItem>();
  const toInsert: PantryItem[] = [];

  for (const log of logs) {
    const existing = byIngredient.get(log.ingredientId) ?? [];
    const sameUnit = existing.find((item) => item.unit === log.unit);
    if (sameUnit) {
      const next = {
        ...sameUnit,
        quantity: Math.max(0, sameUnit.quantity + log.quantity),
        updatedAt: now,
      };
      existing[existing.findIndex((item) => item.id === sameUnit.id)] = next;
      byIngredient.set(log.ingredientId, existing);
      toUpdate.set(next.id, next);
      continue;
    }

    let restored = false;
    for (const item of existing) {
      const converted = convertQuantity(log.quantity, log.unit, item.unit);
      if (converted === null) continue;
      const next = {
        ...item,
        quantity: Math.max(0, item.quantity + converted),
        updatedAt: now,
      };
      existing[existing.findIndex((row) => row.id === item.id)] = next;
      byIngredient.set(log.ingredientId, existing);
      toUpdate.set(next.id, next);
      restored = true;
      break;
    }
    if (restored || log.quantity <= 0) continue;

    const created: PantryItem = {
      id: generateUUID(),
      ingredientId: log.ingredientId,
      quantity: log.quantity,
      unit: log.unit,
      expiresAt: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    existing.push(created);
    byIngredient.set(log.ingredientId, existing);
    toInsert.push(created);
  }

  for (const item of toUpdate.values()) {
    await pantryItemRepository.update(item);
  }
  for (const item of toInsert) {
    await pantryItemRepository.insert(item);
  }
  for (const log of logs) {
    await consumptionLogRepository.delete(log.id);
  }

  await mealRepository.update({ ...meal, isCooked: false, updatedAt: now });
}
