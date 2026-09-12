import { describe, expect, it } from '@jest/globals';
import { defaultMealServings } from '../servings';

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
