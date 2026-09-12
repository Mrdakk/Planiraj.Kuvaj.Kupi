import type { MealType } from '@/constants/categories';
import { mealTypes } from '@/constants/categories';
import { mealTypeRank, recipeHasMealType } from './classification';

export type RecipeMealType = MealType;

type RecipeListItem = {
  name: string;
  mealTypes?: readonly MealType[];
  dishType?: string | null;
};

export function foldSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function recipeMatchesSearch(recipe: RecipeListItem, term: string): boolean {
  const query = foldSearchText(term);
  if (!query) return true;
  const haystack = [
    recipe.name,
    recipe.dishType ?? '',
    ...(recipe.mealTypes ?? []),
  ]
    .map(foldSearchText)
    .join(' ');
  return haystack.includes(query);
}

export function recipeMatchesListMealType(
  recipe: Pick<RecipeListItem, 'mealTypes'>,
  mealType: RecipeMealType
): boolean {
  return recipeHasMealType(recipe, mealType);
}

export function filterRecipes<T extends RecipeListItem>(
  recipes: T[],
  term: string,
  mealType?: RecipeMealType | null
): T[] {
  return recipes.filter((recipe) => {
    if (!recipeMatchesSearch(recipe, term)) return false;
    if (!mealType) return true;
    return recipeMatchesListMealType(recipe, mealType);
  });
}

export function sortRecipesByMealType<T extends RecipeListItem>(recipes: T[]): T[] {
  return [...recipes].sort((a, b) => {
    const rankDiff = mealTypeRank(a) - mealTypeRank(b);
    if (rankDiff !== 0) return rankDiff;
    return foldSearchText(a.name).localeCompare(foldSearchText(b.name));
  });
}

export type RecipeMealTypeGroup<T> = {
  type: MealType | 'Ostalo';
  recipes: T[];
};

function sortRecipesByName<T extends RecipeListItem>(recipes: T[]): T[] {
  return [...recipes].sort((a, b) => foldSearchText(a.name).localeCompare(foldSearchText(b.name)));
}

export function groupRecipesByMealType<T extends RecipeListItem>(
  recipes: T[]
): RecipeMealTypeGroup<T>[] {
  const buckets = new Map<MealType | 'Ostalo', T[]>();
  for (const type of mealTypes) buckets.set(type, []);
  buckets.set('Ostalo', []);

  for (const recipe of recipes) {
    const types = mealTypes.filter((type) => recipeHasMealType(recipe, type));
    if (types.length === 0) {
      buckets.get('Ostalo')?.push(recipe);
      continue;
    }
    for (const type of types) {
      buckets.get(type)?.push(recipe);
    }
  }

  return [...mealTypes, 'Ostalo' as const]
    .map((type) => ({
      type,
      recipes: sortRecipesByName(buckets.get(type) ?? []),
    }))
    .filter((group) => group.recipes.length > 0);
}

export function browseRecipes<T extends RecipeListItem>(
  recipes: T[],
  term: string,
  mealType?: RecipeMealType | null
): T[] {
  return sortRecipesByMealType(filterRecipes(recipes, term, mealType));
}
