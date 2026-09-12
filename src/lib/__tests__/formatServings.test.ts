import { describe, expect, it } from '@jest/globals';
import { formatServings } from '../formatServings';

describe('formatServings', () => {
  it('uses singular for 1 and 21', () => {
    expect(formatServings(1)).toBe('1 porcija');
    expect(formatServings(21)).toBe('21 porcija');
  });

  it('uses few-form for 2, 3 and 4', () => {
    expect(formatServings(2)).toBe('2 porcije');
    expect(formatServings(3)).toBe('3 porcije');
    expect(formatServings(4)).toBe('4 porcije');
    expect(formatServings(22)).toBe('22 porcije');
  });

  it('uses genitive plural for 0, 5 and teens', () => {
    expect(formatServings(0)).toBe('0 porcija');
    expect(formatServings(5)).toBe('5 porcija');
    expect(formatServings(11)).toBe('11 porcija');
    expect(formatServings(12)).toBe('12 porcija');
  });
});
