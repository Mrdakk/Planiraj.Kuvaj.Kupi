export function foldSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function recipeMatchesSearch(
  recipe: { name: string; category?: string | null },
  term: string
): boolean {
  const query = foldSearchText(term);
  if (!query) return true;
  const haystack = [recipe.name, recipe.category ?? '']
    .map(foldSearchText)
    .join(' ');
  return haystack.includes(query);
}

export function filterRecipes<T extends { name: string; category?: string | null }>(
  recipes: T[],
  term: string
): T[] {
  return recipes.filter((recipe) => recipeMatchesSearch(recipe, term));
}
