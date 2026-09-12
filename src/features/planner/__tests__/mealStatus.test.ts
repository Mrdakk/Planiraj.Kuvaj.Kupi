import { describe, expect, it } from '@jest/globals';
import { mealSurface } from '../mealStatus';

describe('mealSurface', () => {
  it('uses sage paper for cooked meals', () => {
    expect(mealSurface(true)).toBe('#EEF2E8');
  });

  it('uses cream paper for uncooked meals', () => {
    expect(mealSurface(false)).toBe('#FFFBF6');
  });
});
