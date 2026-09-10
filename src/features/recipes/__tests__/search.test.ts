import { describe, expect, it } from '@jest/globals';
import { filterRecipes, recipeMatchesSearch } from '../search';

const recipes = [
  { id: '1', name: 'Čorbast pasulj sa dimljenom slaninom', category: 'Ručak' },
  { id: '2', name: 'Omlet sa sirom', category: 'Doručak' },
  { id: '3', name: 'Tuna salata', category: 'Večera' },
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

  it('matches category', () => {
    expect(recipeMatchesSearch(recipes[1], 'dorucak')).toBe(true);
  });
});

describe('filterRecipes', () => {
  it('returns all recipes when the query is empty', () => {
    expect(filterRecipes(recipes, '')).toEqual(recipes);
  });

  it('keeps only recipes that match the query', () => {
    expect(filterRecipes(recipes, 'salata').map((recipe) => recipe.id)).toEqual(['3']);
  });
});
