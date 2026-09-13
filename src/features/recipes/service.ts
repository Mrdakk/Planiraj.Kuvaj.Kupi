import {
  ingredientRepository,
  ingredientAliasRepository,
  recipeRepository,
  recipeIngredientRepository,
} from '@/services/repositories';
import { normalizeIngredientName } from '@/services/ingredientNormalizer';
import { canonicalIngredientName, ingredientNameKey } from '@/lib/ingredientNames';
import { generateUUID } from '@/lib/uuid';
import { nowISO } from '@/database/repository';
import { normalizeRecipeEmoji } from '@/constants/emojis';
import { ensureAlias, linkIngredients } from '@/features/ingredients/link';
import { normalizeMealTypes } from './classification';
import type { Ingredient, Recipe, RecipeIngredient, RecipeWithIngredients } from '@/types';
import type { Unit } from '@/constants/units';
import type { IngredientCategory, DishType, MealType } from '@/constants/categories';

export interface RecipeIngredientInput {
  id?: string;
  rawName?: string;
  ingredientId?: string;
  sourceName?: string;
  linkToIngredientId?: string;
  quantity: number;
  unit: Unit;
  notes?: string;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  baseServings: number;
  prepTimeMinutes?: number;
  mealTypes?: MealType[];
  dishType?: DishType | null;
  steps: string[];
  notes?: string;
  emoji?: string;
  ingredients: RecipeIngredientInput[];
}

export interface IngredientResolution {
  ingredient: Ingredient;
  isNew: boolean;
  aliases: string[];
}

export async function resolveOrCreateIngredient(
  rawName: string,
  suggestedUnit: Unit,
  category: IngredientCategory = 'Ostalo'
): Promise<IngredientResolution> {
  const trimmedName = rawName.trim();
  if (!trimmedName) {
    throw new Error('Sastojak mora imati ime');
  }
  const canonicalName = canonicalIngredientName(trimmedName);

  const normalized = await normalizeIngredientName(canonicalName);

  if (normalized.confidence === 'exact' && normalized.ingredient) {
    return { ingredient: normalized.ingredient, isNew: false, aliases: normalized.aliases };
  }

  const ingredient: Ingredient = {
    id: generateUUID(),
    name: canonicalName,
    category,
    defaultUnit: suggestedUnit,
    emoji: null,
    trackPresence: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  await ingredientRepository.insert(ingredient);

  const aliases = Array.from(
    new Set([trimmedName.toLowerCase(), canonicalName.toLowerCase()])
  );
  for (const aliasValue of aliases) {
    await ingredientAliasRepository.insert({
      id: generateUUID(),
      ingredientId: ingredient.id,
      alias: aliasValue,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
  }

  return { ingredient, isNew: true, aliases };
}

async function aliasSourceName(
  ingredientId: string,
  sourceName: string | undefined,
  currentName: string
): Promise<void> {
  const source = sourceName?.trim();
  if (!source) return;
  if (ingredientNameKey(source) === ingredientNameKey(currentName)) return;
  await ensureAlias(ingredientId, source);
}

async function absorbIfNeeded(previousId: string | undefined, keepId: string): Promise<void> {
  if (!previousId || previousId === keepId) return;
  await linkIngredients(previousId, keepId);
}

export async function applyRecipeIngredientResolution(
  item: RecipeIngredientInput
): Promise<IngredientResolution> {
  const sourceName = item.sourceName?.trim() || undefined;
  const previousId = item.ingredientId?.trim() || undefined;
  const linkToId = item.linkToIngredientId?.trim() || undefined;

  if (linkToId) {
    const keep = await ingredientRepository.findById(linkToId);
    if (!keep?.name.trim()) {
      throw new Error('Namirnica nije pronađena');
    }
    await absorbIfNeeded(previousId, keep.id);
    await aliasSourceName(keep.id, sourceName ?? item.rawName, keep.name);
    return { ingredient: keep, isNew: false, aliases: [] };
  }

  const rawName = item.rawName?.trim() ?? '';
  if (previousId) {
    const previous = await ingredientRepository.findById(previousId);
    if (previous?.name.trim()) {
      if (!rawName || ingredientNameKey(rawName) === ingredientNameKey(previous.name)) {
        await aliasSourceName(previous.id, sourceName, previous.name);
        return { ingredient: previous, isNew: false, aliases: [] };
      }

      const canonicalName = canonicalIngredientName(rawName);
      const normalized = await normalizeIngredientName(canonicalName);
      const matched =
        normalized.confidence === 'exact' && normalized.ingredient
          ? normalized.ingredient
          : null;

      if (matched) {
        await absorbIfNeeded(previous.id, matched.id);
        await aliasSourceName(matched.id, sourceName, matched.name);
        await aliasSourceName(matched.id, previous.name, matched.name);
        return { ingredient: matched, isNew: false, aliases: normalized.aliases };
      }

      const renamed: Ingredient = {
        ...previous,
        name: canonicalName,
        updatedAt: nowISO(),
      };
      await ingredientRepository.update(renamed);
      await aliasSourceName(renamed.id, sourceName, renamed.name);
      await aliasSourceName(renamed.id, previous.name, renamed.name);
      return { ingredient: renamed, isNew: false, aliases: [] };
    }
  }

  if (!rawName) {
    throw new Error('Sastojak mora imati ime');
  }

  const resolved = await resolveOrCreateIngredient(rawName, item.unit);
  await aliasSourceName(resolved.ingredient.id, sourceName, resolved.ingredient.name);
  return resolved;
}

function hasIngredientInput(item: RecipeIngredientInput): boolean {
  return Boolean(
    item.rawName?.trim() || item.ingredientId?.trim() || item.linkToIngredientId?.trim()
  );
}

function recipeClassificationFromInput(input: CreateRecipeInput): {
  mealTypes: MealType[];
  dishType: DishType | null;
} {
  const types = normalizeMealTypes(input.mealTypes ?? []);
  return {
    mealTypes: types.length > 0 ? types : ['Ručak'],
    dishType: input.dishType ?? null,
  };
}

export async function createRecipeWithIngredients(
  input: CreateRecipeInput
): Promise<RecipeWithIngredients> {
  const recipeId = generateUUID();
  const now = nowISO();

  const classification = recipeClassificationFromInput(input);
  const recipe: Recipe = {
    id: recipeId,
    name: input.name.trim(),
    description: input.description?.trim() ?? null,
    imageUri: null,
    baseServings: input.baseServings,
    prepTimeMinutes: input.prepTimeMinutes ?? null,
    mealTypes: classification.mealTypes,
    dishType: classification.dishType,
    isFavorite: false,
    steps: input.steps,
    notes: input.notes?.trim() ?? null,
    emoji: normalizeRecipeEmoji(input.emoji) ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const recipeIngredients: RecipeIngredient[] = [];
  for (const item of input.ingredients) {
    if (!hasIngredientInput(item)) continue;
    const ingredient = await applyRecipeIngredientResolution(item);

    recipeIngredients.push({
      id: item.id ?? generateUUID(),
      recipeId,
      ingredientId: ingredient.ingredient.id,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes?.trim() ?? null,
      sortOrder: recipeIngredients.length,
      createdAt: now,
      updatedAt: now,
    });
  }

  await recipeRepository.insert(recipe);
  for (const ri of recipeIngredients) {
    await recipeIngredientRepository.insert(ri);
  }

  return { ...recipe, ingredients: recipeIngredients };
}

export async function updateRecipeWithIngredients(
  recipe: Recipe,
  input: CreateRecipeInput
): Promise<RecipeWithIngredients> {
  const now = nowISO();
  const classification = recipeClassificationFromInput(input);
  const updatedRecipe: Recipe = {
    ...recipe,
    name: input.name.trim(),
    description: input.description?.trim() ?? null,
    baseServings: input.baseServings,
    prepTimeMinutes: input.prepTimeMinutes ?? null,
    mealTypes: classification.mealTypes,
    dishType: classification.dishType,
    steps: input.steps,
    notes: input.notes?.trim() ?? null,
    emoji: normalizeRecipeEmoji(input.emoji) ?? recipe.emoji,
    updatedAt: now,
  };

  if (recipe.name.trim() !== updatedRecipe.name && !normalizeRecipeEmoji(input.emoji)) {
    updatedRecipe.emoji = null;
  }

  const recipeIngredients: RecipeIngredient[] = [];
  for (const item of input.ingredients) {
    if (!hasIngredientInput(item)) continue;
    const ingredient = await applyRecipeIngredientResolution(item);

    recipeIngredients.push({
      id: item.id ?? generateUUID(),
      recipeId: recipe.id,
      ingredientId: ingredient.ingredient.id,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes?.trim() ?? null,
      sortOrder: recipeIngredients.length,
      createdAt: now,
      updatedAt: now,
    });
  }

  await recipeRepository.update(updatedRecipe);
  const existing = await recipeIngredientRepository.findManyWhere('recipe_id = ?', [
    recipe.id,
  ]);
  for (const item of existing) {
    await recipeIngredientRepository.delete(item.id);
  }
  for (const ri of recipeIngredients) {
    await recipeIngredientRepository.insert(ri);
  }

  return { ...updatedRecipe, ingredients: recipeIngredients };
}
