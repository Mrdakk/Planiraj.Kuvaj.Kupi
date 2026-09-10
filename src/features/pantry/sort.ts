import type { PantryItem } from '@/types';

export function sortPantryItemsByIngredientName(
  items: PantryItem[],
  nameOf: (ingredientId: string) => string
): PantryItem[] {
  return [...items].sort((a, b) => {
    const aEmpty = a.quantity <= 0;
    const bEmpty = b.quantity <= 0;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
    return nameOf(a.ingredientId).localeCompare(nameOf(b.ingredientId), 'sr', { sensitivity: 'base' });
  });
}
