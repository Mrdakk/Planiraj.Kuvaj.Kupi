import { describe, expect, it } from '@jest/globals';
import {
  filterRecipes,
  groupRecipesByMealType,
  recipeMatchesListMealType,
  recipeMatchesSearch,
  sortRecipesByMealType,
} from '../search';
import type { DishType } from '@/constants/categories';
import type { MealType } from '@/constants/categories';

const recipes = [
  {
    id: '1',
    name: 'Čorbast pasulj sa dimljenom slaninom',
    mealTypes: ['Ručak'] as MealType[],
    dishType: 'Čorba' as DishType,
  },
  {
    id: '2',
    name: 'Omlet sa sirom',
    mealTypes: ['Doručak'] as MealType[],
    dishType: null,
  },
  {
    id: '3',
    name: 'Tuna salata',
    mealTypes: ['Večera'] as MealType[],
    dishType: 'Salata' as DishType,
  },
  {
    id: '4',
    name: 'Voćna salata',
    mealTypes: ['Užina'] as MealType[],
    dishType: 'Salata' as DishType,
  },
  {
    id: '5',
    name: 'Musaka krompir–meso',
    mealTypes: ['Ručak', 'Večera'] as MealType[],
    dishType: 'Glavno jelo' as DishType,
  },
  {
    id: '6',
    name: 'Čokoladni kolač',
    mealTypes: ['Desert'] as MealType[],
    dishType: 'Slatko' as DishType,
  },
  { id: '7', name: 'Mystery', mealTypes: [] as MealType[], dishType: null },
];

describe('recipeMatchesSearch', () => {
  it('matches an empty query to every recipe', () => {
    expect(recipeMatchesSearch(recipes[0], '')).toBe(true);
    expect(recipeMatchesSearch(recipes[0], '   ')).toBe(true);
  });

  it('matches name case-insensitively', () => {
    expect(recipeMatchesSearch(recipes[1], 'omlet')).toBe(true);
    expect(recipeMatchesSearch(recipes[1], 'OMLET')).toBe(true);
    expect(recipeMatchesSearch(recipes[1], 'tuna')).toBe(false);
  });

  it('matches through Serbian diacritics', () => {
    expect(recipeMatchesSearch(recipes[0], 'corba')).toBe(true);
    expect(recipeMatchesSearch(recipes[0], 'čorba')).toBe(true);
  });

  it('matches meal type and dish type', () => {
    expect(recipeMatchesSearch(recipes[1], 'dorucak')).toBe(true);
    expect(recipeMatchesSearch(recipes[5], 'slatko')).toBe(true);
    expect(recipeMatchesSearch(recipes[4], 'glavno')).toBe(true);
  });
});

describe('filterRecipes', () => {
  it('returns all recipes when the query is empty', () => {
    expect(filterRecipes(recipes, '')).toEqual(recipes);
  });

  it('keeps only recipes that match the query', () => {
    expect(filterRecipes(recipes, 'salata').map((recipe) => recipe.id)).toEqual(['3', '4']);
  });

  it('keeps recipes that include the selected meal type', () => {
    expect(filterRecipes(recipes, '', 'Doručak').map((recipe) => recipe.id)).toEqual(['2']);
    expect(filterRecipes(recipes, '', 'Užina').map((recipe) => recipe.id)).toEqual(['4']);
    expect(filterRecipes(recipes, '', 'Ručak').map((recipe) => recipe.id)).toEqual(['1', '5']);
    expect(filterRecipes(recipes, '', 'Večera').map((recipe) => recipe.id)).toEqual(['3', '5']);
    expect(filterRecipes(recipes, '', 'Desert').map((recipe) => recipe.id)).toEqual(['6']);
  });

  it('applies search and meal type together', () => {
    expect(filterRecipes(recipes, 'salata', 'Večera').map((recipe) => recipe.id)).toEqual(['3']);
    expect(filterRecipes(recipes, 'salata', 'Ručak')).toEqual([]);
  });
});

describe('recipeMatchesListMealType', () => {
  it('matches a recipe that lists both lunch and dinner', () => {
    expect(recipeMatchesListMealType(recipes[4], 'Ručak')).toBe(true);
    expect(recipeMatchesListMealType(recipes[4], 'Večera')).toBe(true);
  });

  it('does not match a recipe without meal types', () => {
    expect(recipeMatchesListMealType(recipes[6], 'Doručak')).toBe(false);
  });
});

describe('sortRecipesByMealType', () => {
  it('orders recipes Doručak, Užina, Ručak, Večera, Desert, then the rest', () => {
    expect(sortRecipesByMealType(recipes).map((recipe) => recipe.id)).toEqual([
      '2',
      '4',
      '1',
      '5',
      '3',
      '6',
      '7',
    ]);
  });
});

describe('groupRecipesByMealType', () => {
  it('puts recipes under every meal type they belong to', () => {
    expect(
      groupRecipesByMealType(recipes).map((group) => ({
        type: group.type,
        ids: group.recipes.map((recipe) => recipe.id),
      }))
    ).toEqual([
      { type: 'Doručak', ids: ['2'] },
      { type: 'Užina', ids: ['4'] },
      { type: 'Ručak', ids: ['1', '5'] },
      { type: 'Večera', ids: ['5', '3'] },
      { type: 'Desert', ids: ['6'] },
      { type: 'Ostalo', ids: ['7'] },
    ]);
  });

  it('omits empty meal-type sections', () => {
    expect(groupRecipesByMealType([recipes[1]]).map((group) => group.type)).toEqual(['Doručak']);
  });

  it('sorts recipes by name inside a section', () => {
    const ručak = groupRecipesByMealType(recipes).find((group) => group.type === 'Ručak');
    expect(ručak?.recipes.map((recipe) => recipe.id)).toEqual(['1', '5']);
  });
});
