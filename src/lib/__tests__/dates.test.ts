import { describe, expect, it } from '@jest/globals';
import { isCreatedToday, toISODate, dateKey } from '@/lib/dates';

describe('isCreatedToday', () => {
  it('returns true for a recipe created this local day', () => {
    expect(isCreatedToday(new Date().toISOString())).toBe(true);
  });

  it('returns true for a date-only stamp matching local today', () => {
    expect(isCreatedToday(toISODate(new Date()))).toBe(true);
  });

  it('returns false for an older recipe', () => {
    expect(isCreatedToday('2020-01-01T12:00:00.000Z')).toBe(false);
  });

  it('returns false when createdAt is missing', () => {
    expect(isCreatedToday(undefined)).toBe(false);
    expect(isCreatedToday(null)).toBe(false);
    expect(isCreatedToday('')).toBe(false);
  });
});

describe('dateKey', () => {
  it('keeps a plain ISO date', () => {
    expect(dateKey('2026-09-10')).toBe('2026-09-10');
  });

  it('strips time from a timestamp so plan filters still match', () => {
    expect(dateKey('2026-09-10T12:00:00.000Z')).toBe('2026-09-10');
  });
});
