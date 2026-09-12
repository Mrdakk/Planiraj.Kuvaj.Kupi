export type RecipeDraft = {
  name: string;
  description: string;
  baseServings: number | null;
  prepTimeMinutes: number | null;
  category: string;
  steps: string[];
  ingredients: string[];
};

export function isoDurationToMinutes(value?: string | null): number | null {
  if (!value || typeof value !== 'string') return null;
  const match = value
    .trim()
    .match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!match) return null;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const total = days * 24 * 60 + hours * 60 + minutes + Math.round(seconds / 60);
  return total > 0 ? total : null;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function typeIncludes(node: unknown, type: string): boolean {
  if (!node || typeof node !== 'object') return false;
  const raw = (node as Record<string, unknown>)['@type'];
  return asArray(raw).some((item) => {
    const label = String(item).split('/').pop() ?? '';
    return label.toLowerCase() === type.toLowerCase();
  });
}

function walkJsonLd(value: unknown, acc: Record<string, unknown>[]): void {
  if (Array.isArray(value)) {
    value.forEach((item) => walkJsonLd(item, acc));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const node = value as Record<string, unknown>;
  acc.push(node);
  if (node['@graph']) walkJsonLd(node['@graph'], acc);
}

function parseJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const raw = match[1].replace(/<!--[\s\S]*?-->/g, '').trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      try {
        blocks.push(JSON.parse(raw.replace(/,\s*([\]}])/g, '$1')));
      } catch {
        // ignore malformed JSON-LD
      }
    }
  }
  return blocks;
}

function extractServings(yieldValue: unknown): number | null {
  if (typeof yieldValue === 'number' && Number.isFinite(yieldValue)) {
    return Math.max(1, Math.round(yieldValue));
  }
  for (const value of asArray(yieldValue)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(1, Math.round(value));
    }
    if (typeof value === 'string') {
      const match = value.match(/(\d+(?:[.,]\d+)?)/);
      if (match) return Math.max(1, Math.round(Number(match[1].replace(',', '.'))));
    }
    if (value && typeof value === 'object' && 'value' in value) {
      const nested = extractServings((value as { value: unknown }).value);
      if (nested) return nested;
    }
  }
  return null;
}

function ingredientToLine(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const name = String(row.name ?? row.item ?? '').trim();
  const amount = String(row.amount ?? row.quantity ?? '').trim();
  if (amount && name) return `${amount} ${name}`.trim();
  if (name) return name;
  return null;
}

function instructionToLines(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(instructionToLines);
  }
  if (!value || typeof value !== 'object') return [];
  const node = value as Record<string, unknown>;
  if (typeIncludes(node, 'HowToSection') || node.itemListElement) {
    return instructionToLines(node.itemListElement ?? node.steps);
  }
  if (typeof node.text === 'string' && node.text.trim()) {
    return [node.text.trim()];
  }
  if (typeof node.name === 'string' && node.name.trim()) {
    return [node.name.trim()];
  }
  return [];
}

function minutesFromRecipe(node: Record<string, unknown>): number | null {
  const total = isoDurationToMinutes(typeof node.totalTime === 'string' ? node.totalTime : null);
  if (total) return total;
  const prep = isoDurationToMinutes(typeof node.prepTime === 'string' ? node.prepTime : null) ?? 0;
  const cook = isoDurationToMinutes(typeof node.cookTime === 'string' ? node.cookTime : null) ?? 0;
  const sum = prep + cook;
  return sum > 0 ? sum : null;
}

function draftFromRecipeNode(node: Record<string, unknown>): RecipeDraft | null {
  const name = String(node.name ?? '').trim();
  const ingredients = asArray(node.recipeIngredient)
    .map(ingredientToLine)
    .filter((item): item is string => Boolean(item));
  if (!name || ingredients.length === 0) return null;

  return {
    name,
    description: String(node.description ?? '').trim(),
    baseServings: extractServings(node.recipeYield ?? node.yield),
    prepTimeMinutes: minutesFromRecipe(node),
    category: String(asArray(node.recipeCategory)[0] ?? '').trim(),
    steps: instructionToLines(node.recipeInstructions),
    ingredients,
  };
}

export function extractRecipeDraftFromHtml(html: string): RecipeDraft | null {
  const nodes: Record<string, unknown>[] = [];
  for (const block of parseJsonLdBlocks(html)) {
    walkJsonLd(block, nodes);
  }
  for (const node of nodes) {
    if (typeIncludes(node, 'Recipe')) {
      const draft = draftFromRecipeNode(node);
      if (draft) return draft;
    }
  }
  return null;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseQuantity(raw: string): number {
  const normalized = raw.replace(',', '.').trim();
  const fraction = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const denom = Number(fraction[2]);
    if (denom) return Number(fraction[1]) / denom;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseIngredientLine(line: string): {
  rawName: string;
  quantity: number;
  unit: string;
  notes: string;
} {
  const trimmed = line.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return { rawName: 'sastojak', quantity: 1, unit: 'kom', notes: '' };
  }

  const patterns: { re: RegExp; unit: string }[] = [
    { re: /^([\d.,\/]+)\s*(?:kg)\b[.\s]*(.*)$/i, unit: 'kg' },
    { re: /^([\d.,\/]+)\s*(?:g|gr|grama?)\b[.\s]*(.*)$/i, unit: 'g' },
    { re: /^([\d.,\/]+)\s*(?:ml)\b[.\s]*(.*)$/i, unit: 'ml' },
    { re: /^([\d.,\/]+)\s*(?:l|litara?)\b[.\s]*(.*)$/i, unit: 'l' },
    { re: /^([\d.,\/]+)\s*(?:kašičic[aeu]?|kasicic[aeu]?|tsp)\b[.\s]*(.*)$/iu, unit: 'kašičica' },
    { re: /^([\d.,\/]+)\s*(?:kašik[aeu]?|kasik[aeu]?|tbsp)\b[.\s]*(.*)$/iu, unit: 'kašika' },
    { re: /^([\d.,\/]+)\s*(?:glavic[aeu]?)\b[.\s]*(.*)$/i, unit: 'glavica' },
    { re: /^([\d.,\/]+)\s*(?:čen(?:a|ova)?|cena?)\b[.\s]*(.*)$/iu, unit: 'čen' },
    { re: /^([\d.,\/]+)\s*(?:pakovanj[ae]|pack)\b[.\s]*(.*)$/i, unit: 'pakovanje' },
    { re: /^([\d.,\/]+)\s*(?:konzerv[ae])\b[.\s]*(.*)$/i, unit: 'konzerva' },
    { re: /^([\d.,\/]+)\s*(?:flaš[ae]|flasa)\b[.\s]*(.*)$/iu, unit: 'flaša' },
    { re: /^([\d.,\/]+)\s*(?:kom(?:ada?)?|pcs?)\b[.\s]*(.*)$/i, unit: 'kom' },
    { re: /^([\d.,\/]+)\s+(.+)$/i, unit: 'kom' },
  ];

  for (const { re, unit } of patterns) {
    const match = trimmed.match(re);
    if (!match) continue;
    const rawName = match[2].trim() || trimmed;
    return {
      rawName,
      quantity: parseQuantity(match[1]),
      unit,
      notes: '',
    };
  }

  return { rawName: trimmed, quantity: 1, unit: 'kom', notes: '' };
}

export function draftToRecipe(draft: RecipeDraft): Record<string, unknown> {
  return {
    name: draft.name,
    description: draft.description,
    baseServings: draft.baseServings && draft.baseServings > 0 ? draft.baseServings : 4,
    prepTimeMinutes: draft.prepTimeMinutes,
    category: draft.category,
    emoji: '',
    steps: draft.steps,
    notes: '',
    ingredients: draft.ingredients.map(parseIngredientLine),
  };
}
