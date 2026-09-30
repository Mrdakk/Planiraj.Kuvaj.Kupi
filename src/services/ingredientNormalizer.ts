import { ingredientRepository } from '@/services/repositories';
import { ingredientNameKey } from '@/lib/ingredientNames';
import type { Ingredient } from '@/types';

export interface NormalizationResult {
  ingredient: Ingredient | null;
  aliases: string[];
  confidence: 'exact' | 'none';
}

/**
 * Resolve a raw ingredient name against the canonical ingredient database.
 * Only an exact canonical name match counts. Different names stay separate
 * until the user links them with Poveži namirnice.
 */
export async function normalizeIngredientName(
  rawName: string
): Promise<NormalizationResult> {
  const key = ingredientNameKey(rawName);
  if (!key) {
    return { ingredient: null, aliases: [], confidence: 'none' };
  }

  const allIngredients = await ingredientRepository.findAll();
  const exact = allIngredients.find(
    (i) => ingredientNameKey(i.name) === key
  );
  if (exact) {
    return { ingredient: exact, aliases: [], confidence: 'exact' };
  }

  return { ingredient: null, aliases: [], confidence: 'none' };
}

