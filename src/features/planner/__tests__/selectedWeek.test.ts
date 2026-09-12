import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/services/repositories', () => ({
  mealPlanRepository: {
    findManyWhere: jest.fn(),
    insert: jest.fn(),
  },
  mealRepository: {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/database/repository', () => ({
  nowISO: () => '2026-09-01T12:00:00.000Z',
}));

import { shiftPlanWeek, weekScreenSubtitle } from '../service';

describe('shared plan week', () => {
  const today = '2026-09-10';
  const thisWeek = '2026-09-07';
  const nextWeek = '2026-09-14';

  it('shiftPlanWeek moves by whole weeks from Monday', () => {
    expect(shiftPlanWeek(thisWeek, 1)).toBe(nextWeek);
    expect(shiftPlanWeek(nextWeek, -1)).toBe(thisWeek);
  });

  it('weekScreenSubtitle names the current week and shows the range otherwise', () => {
    expect(weekScreenSubtitle(thisWeek, today)).toBe('Ova nedelja · 7–13. septembar');
    expect(weekScreenSubtitle(nextWeek, today)).toBe('14–20. septembar');
  });
});
