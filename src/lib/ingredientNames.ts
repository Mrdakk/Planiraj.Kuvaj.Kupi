import { foldSearchText } from './foldSearchText';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CANONICAL_NAMES: Record<string, string> = {
  so: 'So',
  sol: 'So',
};

export function ingredientNameKey(name: string): string {
  return canonicalIngredientName(name).trim().toLowerCase();
}

export function canonicalIngredientName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  return CANONICAL_NAMES[trimmed.toLowerCase()] ?? trimmed;
}

export function displayIngredientName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed || UUID_PATTERN.test(trimmed)) return 'Sastojak';
  return canonicalIngredientName(trimmed);
}

export function ingredientMatchesSearch(name: string, term: string): boolean {
  const t = foldSearchText(term);
  if (!t) return true;
  if (foldSearchText(displayIngredientName(name)).includes(t) || foldSearchText(name).includes(t)) {
    return true;
  }
  return ingredientNameKey(name) === ingredientNameKey(term);
}
