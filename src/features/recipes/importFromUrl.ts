import { supabase } from '@/lib/supabase';
import { classifyImportedCategory } from '@/features/recipes/classification';
import { normalizeRecipeEmoji } from '@/constants/emojis';
import { allUnits, type Unit } from '@/constants/units';
import type { CreateRecipeInput } from '@/features/recipes/service';

export interface ImportedRecipe extends CreateRecipeInput {
  sourceUrl?: string;
}

const UNIT_SET = new Set<string>(allUnits);

const UNIT_ALIASES: Record<string, Unit> = {
  g: 'g',
  gr: 'g',
  gram: 'g',
  grama: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  litra: 'l',
  litar: 'l',
  kom: 'kom',
  komad: 'kom',
  komada: 'kom',
  pcs: 'kom',
  pc: 'kom',
  glavica: 'glavica',
  glavice: 'glavica',
  čen: 'čen',
  cen: 'čen',
  clove: 'čen',
  pakovanje: 'pakovanje',
  pack: 'pakovanje',
  konzerva: 'konzerva',
  flaša: 'flaša',
  flasa: 'flaša',
  kašika: 'kašika',
  kasika: 'kašika',
  tbsp: 'kašika',
  tablespoon: 'kašika',
  kašičica: 'kašičica',
  kasicica: 'kašičica',
  tsp: 'kašičica',
  teaspoon: 'kašičica',
};

function normalizeUnit(raw: string | undefined): Unit {
  const key = (raw ?? '').trim().toLowerCase();
  if (UNIT_SET.has(key)) return key as Unit;
  return UNIT_ALIASES[key] ?? 'kom';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const fraction = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fraction) {
      const denom = Number(fraction[2]);
      if (denom) return Number(fraction[1]) / denom;
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 1;
}

export function importSourceNote(sourceUrl?: string): string {
  const url = sourceUrl?.trim();
  return url ? `Izvor: ${url}` : 'Uvezeno iz nalepijenog teksta';
}

function mapRecipe(payload: Record<string, unknown>, sourceUrl?: string): ImportedRecipe {
  const ingredientsRaw = Array.isArray(payload.ingredients) ? payload.ingredients : [];
  const stepsRaw = Array.isArray(payload.steps) ? payload.steps : [];
  const ingredients = ingredientsRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const rawName = String(row.rawName ?? row.name ?? '').trim();
      if (!rawName) return null;
      return {
        rawName,
        quantity: Math.max(0.01, asNumber(row.quantity)),
        unit: normalizeUnit(String(row.unit ?? '')),
        notes: String(row.notes ?? '').trim() || undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const steps = stepsRaw.map((step) => String(step).trim()).filter(Boolean);
  const name = String(payload.name ?? '').trim();
  if (!name || ingredients.length === 0) {
    throw new Error('Stranica je pročitana, ali recept nije kompletan. Proveri link ili uredi ručno.');
  }

  const sourceNote = importSourceNote(sourceUrl);
  const notes = String(payload.notes ?? '').trim();

  const classified = classifyImportedCategory(String(payload.category ?? '').trim() || null);

  return {
    name,
    description: String(payload.description ?? '').trim() || undefined,
    baseServings: Math.max(1, Math.round(asNumber(payload.baseServings) || 4)),
    prepTimeMinutes: payload.prepTimeMinutes
      ? Math.max(1, Math.round(asNumber(payload.prepTimeMinutes)))
      : undefined,
    mealTypes: classified.mealTypes,
    dishType: classified.dishType,
    steps,
    notes: notes ? `${notes}\n${sourceNote}` : sourceNote,
    emoji: normalizeRecipeEmoji(String(payload.emoji ?? '')) ?? undefined,
    ingredients,
    ...(sourceUrl?.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
  };
}

const IMPORT_UNAVAILABLE =
  'Uvoz nije dostupan u ovoj instalaciji. Sačuvaj recept ručno ili dodaj Supabase ključeve u EAS preview.';

const IMPORT_OFFLINE = 'Uvoz traži internet. Proveri vezu i pokušaj ponovo.';

async function invokeImportRecipe(
  body: { url: string } | { text: string },
  sourceUrl?: string
): Promise<ImportedRecipe> {
  if (!supabase) {
    throw new Error(IMPORT_UNAVAILABLE);
  }

  let response: Awaited<ReturnType<typeof supabase.functions.invoke>>;
  try {
    response = await supabase.functions.invoke('import-recipe', { body });
  } catch {
    throw new Error(IMPORT_OFFLINE);
  }
  const { data, error } = response;

  if (error) {
    if (error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError') {
      throw new Error(IMPORT_OFFLINE);
    }
    let message = error.message || 'Uvoz nije uspeo.';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const responseBody = (await context.json()) as { error?: string };
        if (responseBody.error) message = responseBody.error;
      } catch {
        // keep fallback message
      }
    }
    throw new Error(message);
  }

  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error);
  }

  if (data && typeof data === 'object' && 'recipe' in data && data.recipe && typeof data.recipe === 'object') {
    return mapRecipe(data.recipe as Record<string, unknown>, sourceUrl);
  }

  if (data && typeof data === 'object' && 'name' in data) {
    return mapRecipe(data as Record<string, unknown>, sourceUrl);
  }

  throw new Error('Recept nije prepoznat. Probaj da nalepiš tekst recepta umesto linka.');
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Unesi ispravan link (http ili https).');
  }
  return invokeImportRecipe({ url: trimmed }, trimmed);
}

export async function importRecipeFromText(text: string): Promise<ImportedRecipe> {
  const trimmed = text.trim();
  if (trimmed.length < 40) {
    throw new Error('Nalepi duži tekst recepta (bar sastojke).');
  }
  return invokeImportRecipe({ text: trimmed });
}
