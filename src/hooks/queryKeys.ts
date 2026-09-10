export const queryKeys = {
  ingredients: ['ingredients'] as const,
  ingredient: (id: string) => ['ingredients', id] as const,
  recipes: ['recipes'] as const,
  recipe: (id: string) => ['recipes', id] as const,
  recipeIngredients: (recipeId: string) => ['recipes', recipeId, 'ingredients'] as const,
  recipeIngredientsAll: ['recipeIngredients'] as const,
  pantryItems: ['pantryItems'] as const,
  mealPlans: ['mealPlans'] as const,
  meals: (planId: string) => ['mealPlans', planId, 'meals'] as const,
  shoppingLists: ['shoppingLists'] as const,
  shoppingItems: (listId: string) => ['shoppingLists', listId, 'items'] as const,
  missing: ['missing'] as const,
};
