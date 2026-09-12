import { describe, expect, it } from '@jest/globals';
import { toServerPayload } from '../payload';

const householdId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('toServerPayload', () => {
  it('adds household_id and drops local-only fields', () => {
    const payload = toServerPayload(
      'ingredients',
      {
        id: 'ing-1',
        name: 'Jaja',
        category: 'Mlečni proizvodi',
        defaultUnit: 'kom',
        trackPresence: true,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        sync_status: 'pending',
      },
      householdId
    );

    expect(payload.household_id).toBe(householdId);
    expect(payload).not.toHaveProperty('sync_status');
    expect(payload.default_unit).toBe('kom');
    expect(payload.track_presence).toBe(true);
    expect(payload.created_at).toBe('2026-09-01T00:00:00.000Z');
  });

  it('maps recipe dish type and keeps meal types as JSON', () => {
    const payload = toServerPayload(
      'recipes',
      {
        id: 'r-1',
        name: 'Čorba',
        dishType: 'Čorba',
        mealTypes: ['Ručak'],
        steps: ['Skuvaj'],
        isFavorite: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      householdId
    );

    expect(payload.category).toBe('Čorba');
    expect(payload.meal_types).toEqual(['Ručak']);
    expect(payload.steps).toEqual(['Skuvaj']);
    expect(payload).not.toHaveProperty('dishType');
    expect(payload).not.toHaveProperty('mealTypes');
  });

  it('parses JSON strings from SQLite rows', () => {
    const payload = toServerPayload(
      'recipes',
      {
        id: 'r-2',
        name: 'Pita',
        category: 'Pečivo',
        meal_types: '["Doručak"]',
        steps: '["Peci"]',
        is_favorite: 1,
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-02T00:00:00.000Z',
        sync_status: 'pending',
      },
      householdId
    );

    expect(payload.meal_types).toEqual(['Doručak']);
    expect(payload.steps).toEqual(['Peci']);
    expect(payload.is_favorite).toBe(true);
  });
});
