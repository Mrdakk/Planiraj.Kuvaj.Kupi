import { describe, expect, it } from '@jest/globals';
import { formatAmount, formatQuantity, parseQuantity } from '../formatQuantity';

describe('formatQuantity', () => {
  it('keeps whole numbers and halves', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(1.5)).toBe('1½');
  });

  it('renders thirds instead of long decimals', () => {
    expect(formatQuantity(2 / 3)).toBe('⅔');
    expect(formatQuantity(1 / 3)).toBe('⅓');
    expect(formatQuantity(133 + 1 / 3)).toBe('133⅓');
  });

  it('snaps leftover decimals to cooking fractions', () => {
    expect(formatQuantity(0.83)).toBe('⅚');
    expect(formatQuantity(0.25)).toBe('¼');
    expect(formatQuantity(0.75)).toBe('¾');
    expect(formatQuantity(1.25)).toBe('1¼');
    expect(formatQuantity(0.2)).toBe('⅙');
    expect(formatQuantity(0.125)).toBe('⅛');
  });

  it('never returns a decimal point', () => {
    expect(formatQuantity(0.83)).not.toMatch(/\d+\.\d+/);
    expect(formatQuantity(1.66)).not.toMatch(/\d+\.\d+/);
    expect(formatQuantity(4.2)).not.toMatch(/\d+\.\d+/);
  });
});

describe('formatAmount', () => {
  it('converts small kg and l values to g and ml', () => {
    expect(formatAmount(2 / 3, 'kg')).toBe('667 g');
    expect(formatAmount(0.2, 'l')).toBe('200 ml');
  });

  it('keeps count units as rough fractions, never decimals', () => {
    expect(formatAmount(2 / 3, 'glavica')).toBe('⅔ glavica');
    expect(formatAmount(2, 'kom')).toBe('2 kom');
    expect(formatAmount(0.83, 'kašičica')).toBe('⅚ kašičica');
    expect(formatAmount(0.25, 'kašika')).toBe('¼ kašika');
    expect(formatAmount(1.25, 'konzerva')).toBe('1¼ konzerva');
    expect(formatAmount(0.75, 'kom')).toBe('¾ kom');
    expect(formatAmount(0.83, 'kašičica')).not.toMatch(/\d+\.\d+/);
  });
});

describe('parseQuantity', () => {
  it('parses unicode fractions', () => {
    expect(parseQuantity('⅔')).toBeCloseTo(2 / 3);
    expect(parseQuantity('½')).toBe(0.5);
    expect(parseQuantity('¼')).toBe(0.25);
    expect(parseQuantity('⅚')).toBeCloseTo(5 / 6);
    expect(parseQuantity('1¼')).toBe(1.25);
  });
});
