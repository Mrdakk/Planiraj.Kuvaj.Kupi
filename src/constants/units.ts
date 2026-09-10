export const weightUnits = ['g', 'kg'] as const;
export const volumeUnits = ['ml', 'l'] as const;
export const countUnits = [
  'kom',
  'glavica',
  'čen',
  'pakovanje',
  'konzerva',
  'flaša',
  'kašika',
  'kašičica',
] as const;

export const allUnits = [...weightUnits, ...volumeUnits, ...countUnits] as const;

export type WeightUnit = (typeof weightUnits)[number];
export type VolumeUnit = (typeof volumeUnits)[number];
export type CountUnit = (typeof countUnits)[number];
export type Unit = WeightUnit | VolumeUnit | CountUnit;

export const unitTypeMap: Record<Unit, 'weight' | 'volume' | 'count'> = {
  g: 'weight',
  kg: 'weight',
  ml: 'volume',
  l: 'volume',
  kom: 'count',
  glavica: 'count',
  čen: 'count',
  pakovanje: 'count',
  konzerva: 'count',
  flaša: 'count',
  kašika: 'count',
  kašičica: 'count',
};

export const unitDisplayNames: Record<Unit, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  kom: 'kom',
  glavica: 'glavica',
  čen: 'čen',
  pakovanje: 'pakovanje',
  konzerva: 'konzerva',
  flaša: 'flaša',
  kašika: 'kašika',
  kašičica: 'kašičica',
};

export const unitPluralNames: Record<Unit, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  kom: 'komada',
  glavica: 'glavica',
  čen: 'čena',
  pakovanje: 'pakovanja',
  konzerva: 'konzerve',
  flaša: 'flaše',
  kašika: 'kašike',
  kašičica: 'kašičice',
};

export const conversionFactors: Record<
  Unit,
  Partial<Record<Unit, number>>
> = {
  g: { kg: 0.001 },
  kg: { g: 1000 },
  ml: { l: 0.001 },
  l: { ml: 1000 },
  kom: {},
  glavica: {},
  čen: {},
  pakovanje: {},
  konzerva: {},
  flaša: {},
  kašika: {},
  kašičica: {},
};

/**
 * Convert a quantity from one unit to another.
 * Returns null if conversion is not defined.
 */
export function convertQuantity(
  quantity: number,
  from: Unit,
  to: Unit
): number | null {
  if (from === to) return quantity;
  const factor = conversionFactors[from]?.[to];
  if (factor === undefined) return null;
  return quantity * factor;
}

export function isUnitCompatible(a: Unit, b: Unit): boolean {
  if (a === b) return true;
  return conversionFactors[a]?.[b] !== undefined || conversionFactors[b]?.[a] !== undefined;
}
