import { describe, expect, it } from '@jest/globals';
import { mealSurface } from '../mealStatus';

describe('mealSurface', () => {
  it('uses a light mint green for cooked meals', () => {
    expect(mealSurface(true)).toBe('#F0FDF4');
  });

  it('uses a light peach for uncooked meals', () => {
    expect(mealSurface(false)).toBe('#FFF7ED');
  });
});
