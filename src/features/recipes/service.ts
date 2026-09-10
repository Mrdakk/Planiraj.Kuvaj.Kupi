import {
  ingredientRepository,
  ingredientAliasRepository,
  recipeRepository,
  recipeIngredientRepository,
} from '@/services/repositories';
import { normalizeIngredientName } from '@/services/ingredientNormalizer';
import { canonicalIngredientName } from '@/lib/ingredientNames';
import { generateUUID } from '@/lib/uuid';
import { nowISO } from '@/database/repository';
import { normalizeRecipeEmoji } from '@/constants/emojis';
import type { Ingredient, Recipe, RecipeIngredient, RecipeWithIngredients } from '@/types';
import type { Unit } from '@/constants/units';
import type { IngredientCategory } from '@/constants/categories';
import { ensurePantryPresence } from '@/features/pantry/ensure';

export interface RecipeIngredientInput {
  id?: string;
  rawName?: string;
  ingredientId?: string;
  quantity: number;
  unit: Unit;
  notes?: string;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  baseServings: number;
  prepTimeMinutes?: number;
  category?: string;
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

  if (normalized.confidence === 'exact' || normalized.confidence === 'alias') {
    if (normalized.ingredient) {
      return { ingredient: normalized.ingredient, isNew: false, aliases: normalized.aliases };
    }
  }

  if (normalized.confidence === 'suggested' && normalized.ingredient) {
    return { ingredient: normalized.ingredient, isNew: false, aliases: [] };
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

async function resolveIngredientFromInput(item: RecipeIngredientInput) {
  const rawName = item.rawName?.trim() ?? '';
  if (rawName) {
    return resolveOrCreateIngredient(rawName, item.unit);
  }
  if (item.ingredientId) {
    const existing = await ingredientRepository.findById(item.ingredientId);
    if (existing?.name.trim()) {
      return { ingredient: existing, isNew: false, aliases: [] as string[] };
    }
  }
  throw new Error('Sastojak mora imati ime');
}

export async function createRecipeWithIngredients(
  input: CreateRecipeInput
): Promise<RecipeWithIngredients> {
  const recipeId = generateUUID();
  const now = nowISO();

  const recipe: Recipe = {
    id: recipeId,
    name: input.name.trim(),
    description: input.description?.trim() ?? null,
    imageUri: null,
    baseServings: input.baseServings,
    prepTimeMinutes: input.prepTimeMinutes ?? null,
    category: input.category?.trim() ?? null,
    isFavorite: false,
    steps: input.steps,
    notes: input.notes?.trim() ?? null,
    emoji: normalizeRecipeEmoji(input.emoji) ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const recipeIngredients: RecipeIngredient[] = [];
  for (const item of input.ingredients) {
    if (!item.rawName?.trim() && !item.ingredientId) continue;
    const ingredient = await resolveIngredientFromInput(item);

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
    await ensurePantryPresence(ingredient.ingredient.id, item.unit);
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
  const updatedRecipe: Recipe = {
    ...recipe,
    name: input.name.trim(),
    description: input.description?.trim() ?? null,
    baseServings: input.baseServings,
    prepTimeMinutes: input.prepTimeMinutes ?? null,
    category: input.category?.trim() ?? null,
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
    if (!item.rawName?.trim() && !item.ingredientId) continue;
    const ingredient = await resolveIngredientFromInput(item);

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
    await ensurePantryPresence(ingredient.ingredient.id, item.unit);
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
