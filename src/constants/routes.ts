export const routes = {
  tabs: {
    plan: 'plan',
    kitchen: 'kitchen',
    missing: 'missing',
    shopping: 'shopping',
    more: 'more',
  },
  screens: {
    recipeDetail: 'recipes/[id]',
    recipeEdit: 'recipes/edit/[id]',
    recipeCreate: 'recipes/create',
    pantryItemDetail: 'pantry/[id]',
    mealDetail: 'meals/[id]',
    mealCreate: 'meals/create',
    mealEdit: 'meals/edit/[id]',
    shoppingItemDetail: 'shopping/[id]',
    settings: 'settings',
    favorites: 'favorites',
    history: 'history',
  },
} as const;

export const tabLabels = {
  plan: 'Plan',
  kitchen: 'Kuhinja',
  missing: 'Fali',
  shopping: 'Kupovina',
  more: 'Više',
} as const;
