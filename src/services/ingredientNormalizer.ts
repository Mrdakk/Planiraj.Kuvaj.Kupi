import {
  ingredientRepository,
  ingredientAliasRepository,
} from '@/services/repositories';
import { ingredientNameKey } from '@/lib/ingredientNames';
import type { Ingredient } from '@/types';

export interface NormalizationResult {
  ingredient: Ingredient | null;
  aliases: string[];
  confidence: 'exact' | 'alias' | 'suggested' | 'none';
}

/**
 * Normalize a raw ingredient name against the canonical ingredient database.
 * - Exact match on canonical name: exact confidence.
 * - Match on alias: alias confidence.
 * - No match: none confidence (caller should create a new ingredient or ask user).
 */
export async function normalizeIngredientName(
  rawName: string
): Promise<NormalizationResult> {
  const normalized = rawName.trim().toLowerCase();
  if (!normalized) {
    return { ingredient: null, aliases: [], confidence: 'none' };
  }

  const allIngredients = await ingredientRepository.findAll();
  const key = ingredientNameKey(rawName);

  const exact = allIngredients.find(
    (i) => ingredientNameKey(i.name) === key
  );
  if (exact) {
    return { ingredient: exact, aliases: [], confidence: 'exact' };
  }

  const allAliases = await ingredientAliasRepository.findAll();
  const matchingAlias = allAliases.find(
    (a) =>
      a.alias.trim().toLowerCase() === normalized ||
      ingredientNameKey(a.alias) === key
  );
  if (matchingAlias) {
    const ingredient = allIngredients.find(
      (i) => i.id === matchingAlias.ingredientId
    );
    if (ingredient) {
      return { ingredient, aliases: [matchingAlias.alias], confidence: 'alias' };
    }
  }

  // Suggest possible canonical ingredients by substring similarity (simple).
  const suggestions = allIngredients.filter((i) => {
    const canonical = i.name.trim().toLowerCase();
    if (!canonical || canonical.length < 3 || normalized.length < 3) return false;
    return canonical.includes(normalized) || normalized.includes(canonical);
  });

  if (suggestions.length === 1) {
    return {
      ingredient: suggestions[0],
      aliases: [],
      confidence: 'suggested',
    };
  }

  return { ingredient: null, aliases: [], confidence: 'none' };
}

export function normalizeName(rawName: string): string {
  return ingredientNameKey(rawName);
}

export function findDuplicates(
  ingredients: Ingredient[],
  rawName: string
): Ingredient[] {
  const normalized = normalizeName(rawName);
  return ingredients.filter(
    (i) => normalizeName(i.name) === normalized
  );
}
