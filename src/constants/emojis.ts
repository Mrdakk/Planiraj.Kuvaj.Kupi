import type { IngredientCategory } from '@/constants/categories';

const RECIPE_KEYWORDS: [string, string][] = [
  ['bolonjeze', '🍝'],
  ['špaget', '🍝'],
  ['spaget', '🍝'],
  ['pasta', '🍝'],
  ['musaka', '🥘'],
  ['čorba', '🍲'],
  ['corba', '🍲'],
  ['pasulj', '🍲'],
  ['grah', '🍲'],
  ['rižoto', '🍚'],
  ['rizoto', '🍚'],
  ['piletina', '🍗'],
  ['pile', '🍗'],
  ['fajita', '🌮'],
  ['tortilja', '🌮'],
];

const INGREDIENT_KEYWORDS: [string, string][] = [
  ['beli luk', '🧄'],
  ['crni luk', '🧅'],
  ['luk', '🧅'],
  ['pasulj', '🫘'],
  ['slanina', '🥓'],
  ['krompir', '🥔'],
  ['brašno', '🌾'],
  ['aleva paprika', '🌶️'],
  ['paprika', '🫑'],
  ['kurkuma', '🟡'],
  ['goveđa kocka', '🧊'],
  ['paradajz', '🍅'],
  ['maslinovo ulje', '🫒'],
  ['ulje', '🫙'],
  ['bosiljak', '🌿'],
  ['mleveno meso', '🥩'],
  ['meso', '🥩'],
  ['vegeta', '🧂'],
  ['kumin', '🌿'],
  ['peršun', '🌿'],
  ['origano', '🌿'],
  ['lovor', '🍃'],
  ['jaja', '🥚'],
  ['jaje', '🥚'],
  ['mleko', '🥛'],
  ['pavlaka', '🥛'],
  ['kačkavalj', '🧀'],
  ['parmezan', '🧀'],
  ['sir', '🧀'],
  ['špageti', '🍝'],
  ['testenina', '🍝'],
  ['so', '🧂'],
  ['biber', '🧂'],
  ['voda', '💧'],
  ['pirinač', '🍚'],
  ['kukuruz', '🌽'],
  ['pečurke', '🍄'],
  ['pečurka', '🍄'],
  ['hleb', '🍞'],
  ['piletina', '🍗'],
];

const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  Povrće: '🥬',
  Voće: '🍎',
  Meso: '🥩',
  'Mlečni proizvodi': '🧀',
  'Testenine i žitarice': '🍝',
  Konzervirano: '🥫',
  Začini: '🧂',
  Ostalo: '🧺',
};

function matchKeyword(name: string, pairs: [string, string][]): string | null {
  const normalized = name.trim().toLowerCase();
  const sorted = [...pairs].sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, emoji] of sorted) {
    if (normalized.includes(keyword)) return emoji;
  }
  return null;
}

export function normalizeRecipeEmoji(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 8) return null;
  const match = trimmed.match(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u);
  if (!match) return null;
  return match[0] === trimmed ? trimmed : null;
}

export type SaltShakerContents = 'salt' | 'pepper' | 'vegeta';

function ingredientWords(name: string): string[] {
  return name
    .trim()
    .toLowerCase()
    .split(/[^a-zčćžšđ]+/i)
    .filter(Boolean);
}

export function getSaltShakerContents(name: string): SaltShakerContents | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized || normalized.includes('soja')) return null;
  const words = ingredientWords(normalized);
  if (words.includes('vegeta')) {
    return 'vegeta';
  }
  if (words.includes('biber') || words.some((word) => word.includes('pepper'))) {
    return 'pepper';
  }
  if (words.includes('so') || words.includes('sol')) {
    return 'salt';
  }
  return null;
}

export function getRecipeEmoji(name: string, stored?: string | null): string {
  return normalizeRecipeEmoji(stored) ?? matchKeyword(name, RECIPE_KEYWORDS) ?? '🍽️';
}

export function getIngredientEmoji(
  name: string,
  category?: string,
  stored?: string | null
): string {
  return (
    normalizeRecipeEmoji(stored) ??
    matchKeyword(name, INGREDIENT_KEYWORDS) ??
    (category && category in CATEGORY_EMOJI
      ? CATEGORY_EMOJI[category as IngredientCategory]
      : null) ??
    '🧺'
  );
}
