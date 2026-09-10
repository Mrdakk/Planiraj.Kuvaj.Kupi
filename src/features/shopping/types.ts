import type { GroceryStoreSection } from '@/constants/categories';
import type { Unit } from '@/constants/units';
import type { ShoppingItem, ShoppingList } from '@/types';

export type ShoppingConflictMode = 'merge' | 'separate';

export interface ShoppingAddLine {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: GroceryStoreSection;
  sourceMealIds: string[];
}

export interface ShoppingAddConflict {
  line: ShoppingAddLine;
  existing: ShoppingItem;
}

export interface ShoppingAddPreview {
  list: ShoppingList;
  newLines: ShoppingAddLine[];
  conflicts: ShoppingAddConflict[];
}
