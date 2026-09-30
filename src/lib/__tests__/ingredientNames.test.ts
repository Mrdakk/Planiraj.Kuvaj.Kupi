import { describe, expect, it } from '@jest/globals';
import {
  canonicalIngredientName,
  displayIngredientName,
  ingredientMatchesSearch,
  ingredientNameKey,
} from '../ingredientNames';

describe('canonicalIngredientName', () => {
  it('treats so and sol as So', () => {
    expect(canonicalIngredientName('so')).toBe('So');
    expect(canonicalIngredientName('SOL')).toBe('So');
    expect(canonicalIngredientName(' So ')).toBe('So');
    expect(canonicalIngredientName('sol')).toBe('So');
  });

  it('leaves other names unchanged', () => {
    expect(canonicalIngredientName('Soja')).toBe('Soja');
    expect(canonicalIngredientName('Biber')).toBe('Biber');
  });
});

describe('displayIngredientName', () => {
  it('shows So for salt aliases and hides UUIDs', () => {
    expect(displayIngredientName('sol')).toBe('So');
    expect(displayIngredientName('so')).toBe('So');
    expect(displayIngredientName('Crni luk')).toBe('Crni luk');
    expect(displayIngredientName('48f53c4e-b1a5-4a44-a4e4-d54ba1751aa6')).toBe('Sastojak');
  });
});

describe('ingredientNameKey', () => {
  it('uses the same key for so and sol', () => {
    expect(ingredientNameKey('so')).toBe(ingredientNameKey('sol'));
    expect(ingredientNameKey('So')).toBe('so');
  });
});

describe('ingredientMatchesSearch', () => {
  it('finds So when searching for sol', () => {
    expect(ingredientMatchesSearch('So', 'sol')).toBe(true);
    expect(ingredientMatchesSearch('sol', 'so')).toBe(true);
    expect(ingredientMatchesSearch('Biber', 'sol')).toBe(false);
  });

  it('ignores Serbian diacritics', () => {
    expect(ingredientMatchesSearch('Čokolada', 'cokolada')).toBe(true);
    expect(ingredientMatchesSearch('Đumbir', 'djumbir')).toBe(true);
    expect(ingredientMatchesSearch('Šargarepa', 'SARG')).toBe(true);
  });
});
