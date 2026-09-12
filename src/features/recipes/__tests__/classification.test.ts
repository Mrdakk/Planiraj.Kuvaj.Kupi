import { describe, expect, it } from '@jest/globals';
import {
  classifyLegacyRecipeCategory,
  normalizeMealTypes,
  parseMealTypesJson,
} from '../classification';

describe('classifyLegacyRecipeCategory', () => {
  it('maps meal slots to meal types and clears dish type', () => {
    expect(classifyLegacyRecipeCategory('Doručak')).toEqual({
      mealTypes: ['Doručak'],
      dishType: null,
    });
    expect(classifyLegacyRecipeCategory('Ručak')).toEqual({
      mealTypes: ['Ručak'],
      dishType: null,
    });
    expect(classifyLegacyRecipeCategory('Večera')).toEqual({
      mealTypes: ['Večera'],
      dishType: null,
    });
    expect(classifyLegacyRecipeCategory('Užina')).toEqual({
      mealTypes: ['Užina'],
      dishType: null,
    });
  });

  it('maps Desert to the desert slot and slatko dish', () => {
    expect(classifyLegacyRecipeCategory('Desert')).toEqual({
      mealTypes: ['Desert'],
      dishType: 'Slatko',
    });
  });

  it('maps Glavno jelo to lunch and dinner', () => {
    expect(classifyLegacyRecipeCategory('Glavno jelo')).toEqual({
      mealTypes: ['Ručak', 'Večera'],
      dishType: 'Glavno jelo',
    });
  });

  it('keeps a known dish type without inventing a meal slot', () => {
    expect(classifyLegacyRecipeCategory('Čorba')).toEqual({
      mealTypes: [],
      dishType: 'Čorba',
    });
    expect(classifyLegacyRecipeCategory('Salata')).toEqual({
      mealTypes: [],
      dishType: 'Salata',
    });
  });

  it('returns empty classification for blank or unknown labels', () => {
    expect(classifyLegacyRecipeCategory(null)).toEqual({ mealTypes: [], dishType: null });
    expect(classifyLegacyRecipeCategory('')).toEqual({ mealTypes: [], dishType: null });
    expect(classifyLegacyRecipeCategory('Italijanska')).toEqual({
      mealTypes: [],
      dishType: null,
    });
  });
});

describe('normalizeMealTypes', () => {
  it('keeps unique values in plan order', () => {
    expect(normalizeMealTypes(['Večera', 'Doručak', 'Večera', 'Ručak'])).toEqual([
      'Doručak',
      'Ručak',
      'Večera',
    ]);
  });

  it('drops unknown values', () => {
    expect(normalizeMealTypes(['Brunch', 'Užina'])).toEqual(['Užina']);
  });
});

describe('parseMealTypesJson', () => {
  it('parses a JSON array of meal types', () => {
    expect(parseMealTypesJson('["Desert","Užina"]')).toEqual(['Užina', 'Desert']);
  });

  it('returns an empty list for invalid JSON', () => {
    expect(parseMealTypesJson(null)).toEqual([]);
    expect(parseMealTypesJson('not-json')).toEqual([]);
  });
});
