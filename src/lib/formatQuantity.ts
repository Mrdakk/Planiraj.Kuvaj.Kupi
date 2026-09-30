const HALF_EPSILON = 1e-6;

const COOKING_FRACTIONS: { value: number; glyph: string }[] = [
  { value: 0, glyph: '' },
  { value: 1 / 8, glyph: '⅛' },
  { value: 1 / 6, glyph: '⅙' },
  { value: 1 / 4, glyph: '¼' },
  { value: 1 / 3, glyph: '⅓' },
  { value: 3 / 8, glyph: '⅜' },
  { value: 1 / 2, glyph: '½' },
  { value: 5 / 8, glyph: '⅝' },
  { value: 2 / 3, glyph: '⅔' },
  { value: 3 / 4, glyph: '¾' },
  { value: 5 / 6, glyph: '⅚' },
  { value: 7 / 8, glyph: '⅞' },
  { value: 1, glyph: '' },
];

const UNICODE_FRACTION_VALUES: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
};

function snapCookingFraction(fraction: number): { extraWhole: number; glyph: string } {
  let best = COOKING_FRACTIONS[0];
  let bestDist = Infinity;
  for (const candidate of COOKING_FRACTIONS) {
    const dist = Math.abs(fraction - candidate.value);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  if (!best || best.value === 0) return { extraWhole: 0, glyph: '' };
  if (best.value === 1) return { extraWhole: 1, glyph: '' };
  return { extraWhole: 0, glyph: best.glyph };
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return String(value);

  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  let whole = Math.floor(abs + HALF_EPSILON);
  let fraction = abs - whole;
  if (fraction < 0) fraction = 0;

  const snapped = snapCookingFraction(fraction);
  whole += snapped.extraWhole;

  if (whole === 0 && !snapped.glyph) {
    if (abs > HALF_EPSILON) return `${sign}⅛`;
    return `${sign}0`;
  }

  if (!snapped.glyph) return `${sign}${whole}`;
  if (whole === 0) return `${sign}${snapped.glyph}`;
  return `${sign}${whole}${snapped.glyph}`;
}

export function formatAmount(quantity: number, unit: string): string {
  if (unit === 'kg' && quantity > 0 && quantity < 1) {
    return `${formatQuantity(Math.round(quantity * 1000))} g`;
  }
  if (unit === 'l' && quantity > 0 && quantity < 1) {
    return `${formatQuantity(Math.round(quantity * 1000))} ml`;
  }
  if ((unit === 'g' || unit === 'ml') && Number.isFinite(quantity)) {
    return `${formatQuantity(Math.round(quantity))} ${unit}`;
  }
  return `${formatQuantity(quantity)} ${unit}`;
}

export function parseQuantity(text: string): number {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return 0;

  const unicodeFraction = trimmed.match(/^(-)?(\d*)([½⅓⅔¼¾⅛⅜⅝⅞⅙⅚⅕⅖⅗⅘])$/);
  if (unicodeFraction) {
    const whole = unicodeFraction[2] ? Number(unicodeFraction[2]) : 0;
    const part = UNICODE_FRACTION_VALUES[unicodeFraction[3] ?? ''] ?? 0;
    const value = whole + part;
    return unicodeFraction[1] ? -value : value;
  }

  const mixed = trimmed.match(/^(-)?(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const value = Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]);
    return mixed[1] ? -value : value;
  }

  const fraction = trimmed.match(/^(-)?(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const value = Number(fraction[2]) / Number(fraction[3]);
    return fraction[1] ? -value : value;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Positive amount from user input, or null when empty, invalid, zero or negative. */
export function parsePositiveQuantity(text: string): number | null {
  const value = parseQuantity(text);
  return value > 0 ? value : null;
}

/** Kitchen stock may be 0 (used up); null when empty, invalid or negative. */
export function parseStockQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^0+([.,]0*)?$/.test(trimmed)) return 0;
  return parsePositiveQuantity(trimmed);
}

/** Plain decimal for edit fields; `formatQuantity` snaps to fractions and would alter the value on save. */
export function formatEditableQuantity(value: number): string {
  if (!Number.isFinite(value)) return '';
  return String(Math.round(value * 1000) / 1000).replace('.', ',');
}
