import { supabase } from '@/lib/supabase';
import { normalizeRecipeEmoji } from '@/constants/emojis';
import { nowISO } from '@/database/repository';
import { ingredientRepository, recipeRepository } from '@/services/repositories';
import type { Ingredient, Recipe } from '@/types';

let assigningRecipes = false;
let assigningIngredients = false;
const attemptedRecipeIds = new Set<string>();
const attemptedIngredientIds = new Set<string>();

function lookupEmoji(map: Record<string, string>, name: string): string | null {
  const direct = normalizeRecipeEmoji(map[name]);
  if (direct) return direct;
  const lower = name.trim().toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (key.trim().toLowerCase() === lower) {
      return normalizeRecipeEmoji(value);
    }
  }
  return null;
}

async function invokeImportRecipe(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('import-recipe', { body });
  if (error) {
    let message = error.message || 'Groq nije uspeo.';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string };
        if (payload.error) message = payload.error;
      } catch {
        // keep fallback
      }
    }
    throw new Error(message);
  }
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    throw new Error((data as { error: string }).error);
  }
  return data;
}

async function parseEmojiMap(data: unknown): Promise<Record<string, string>> {
  const raw =
    data && typeof data === 'object' && 'emojis' in data && data.emojis && typeof data.emojis === 'object'
      ? (data.emojis as Record<string, unknown>)
      : {};

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const emoji = normalizeRecipeEmoji(String(value));
    if (emoji) result[key] = emoji;
  }
  return result;
}

export async function suggestRecipeEmojis(names: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, 40);
  if (unique.length === 0) return {};
  return parseEmojiMap(await invokeImportRecipe({ names: unique }));
}

export async function suggestIngredientEmojis(names: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, 40);
  if (unique.length === 0) return {};
  return parseEmojiMap(await invokeImportRecipe({ ingredientNames: unique }));
}

export async function assignMissingRecipeEmojis(recipes: Recipe[]): Promise<boolean> {
  const missing = recipes
    .filter((recipe) => !normalizeRecipeEmoji(recipe.emoji) && !attemptedRecipeIds.has(recipe.id))
    .slice(0, 40);
  if (missing.length === 0 || assigningRecipes) return false;
  for (const recipe of missing) attemptedRecipeIds.add(recipe.id);
  assigningRecipes = true;
  try {
    const map = await suggestRecipeEmojis(missing.map((recipe) => recipe.name));
    const now = nowISO();
    let changed = false;
    for (const recipe of missing) {
      const emoji = lookupEmoji(map, recipe.name);
      if (!emoji) continue;
      await recipeRepository.update({ ...recipe, emoji, updatedAt: now });
      changed = true;
    }
    return changed;
  } catch {
    return false;
  } finally {
    assigningRecipes = false;
  }
}

export async function assignMissingIngredientEmojis(ingredients: Ingredient[]): Promise<boolean> {
  const missing = ingredients
    .filter(
      (ingredient) =>
        !normalizeRecipeEmoji(ingredient.emoji) && !attemptedIngredientIds.has(ingredient.id)
    )
    .slice(0, 40);
  if (missing.length === 0 || assigningIngredients) return false;
  for (const ingredient of missing) attemptedIngredientIds.add(ingredient.id);
  assigningIngredients = true;
  try {
    const map = await suggestIngredientEmojis(missing.map((ingredient) => ingredient.name));
    const now = nowISO();
    let changed = false;
    for (const ingredient of missing) {
      const emoji = lookupEmoji(map, ingredient.name);
      if (!emoji) continue;
      await ingredientRepository.update({ ...ingredient, emoji, updatedAt: now });
      changed = true;
    }
    return changed;
  } catch {
    return false;
  } finally {
    assigningIngredients = false;
  }
}
