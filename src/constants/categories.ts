export const ingredientCategories = [
  'Povrće',
  'Voće',
  'Meso',
  'Mlečni proizvodi',
  'Testenine i žitarice',
  'Konzervirano',
  'Začini',
  'Ostalo',
] as const;

export type IngredientCategory = (typeof ingredientCategories)[number];

export function isIngredientCategory(value: string): value is IngredientCategory {
  return (ingredientCategories as readonly string[]).includes(value);
}

export const groceryStoreSections = [
  'Povrće',
  'Voće',
  'Meso',
  'Mlečni proizvodi',
  'Testenine i žitarice',
  'Konzervirano',
  'Začini',
  'Smrznuto',
  'Pekara',
  'Hemija i kućna hemija',
  'Ostalo',
] as const;

export type GroceryStoreSection = (typeof groceryStoreSections)[number];

export const categoryToStoreSection = (
  category: IngredientCategory
): GroceryStoreSection => {
  switch (category) {
    case 'Povrće':
      return 'Povrće';
    case 'Voće':
      return 'Voće';
    case 'Meso':
      return 'Meso';
    case 'Mlečni proizvodi':
      return 'Mlečni proizvodi';
    case 'Testenine i žitarice':
      return 'Testenine i žitarice';
    case 'Konzervirano':
      return 'Konzervirano';
    case 'Začini':
      return 'Začini';
    case 'Ostalo':
    default:
      return 'Ostalo';
  }
};

export const mealTypes = ['Doručak', 'Užina', 'Ručak', 'Večera', 'Desert'] as const;
export type MealType = (typeof mealTypes)[number];

export const dishTypes = ['Čorba', 'Salata', 'Glavno jelo', 'Prilog', 'Pečivo', 'Slatko'] as const;
export type DishType = (typeof dishTypes)[number];

export function isMealType(value: string): value is MealType {
  return (mealTypes as readonly string[]).includes(value);
}

export function isDishType(value: string): value is DishType {
  return (dishTypes as readonly string[]).includes(value);
}
