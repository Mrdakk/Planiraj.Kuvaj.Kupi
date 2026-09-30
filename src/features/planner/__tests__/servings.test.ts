import { describe, expect, it } from '@jest/globals';
import { defaultMealServings, parseServings } from '../servings';

describe('parseServings', () => {
  it('accepts whole numbers and decimal comma', () => {
    expect(parseServings('3')).toBe(3);
    expect(parseServings('1,5')).toBe(1.5);
  });

  it('rejects values below one and garbage', () => {
    expect(parseServings('')).toBeNull();
    expect(parseServings('0,5')).toBeNull();
    expect(parseServings('-3')).toBeNull();
    expect(parseServings('abc')).toBeNull();
  });
});

describe('defaultMealServings', () => {
  it('uses the recipe base servings', () => {
    expect(defaultMealServings(6)).toBe(6);
  });

  it('falls back to 4 when base servings are missing or invalid', () => {
    expect(defaultMealServings(undefined)).toBe(4);
    expect(defaultMealServings(null)).toBe(4);
    expect(defaultMealServings(0)).toBe(4);
    expect(defaultMealServings(-2)).toBe(4);
  });
});
