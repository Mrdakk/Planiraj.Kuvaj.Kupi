import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Ingredient, IngredientAlias } from '@/types';

jest.mock('@/services/repositories', () => ({
  ingredientRepository: {
    findAll: jest.fn(),
  },
  ingredientAliasRepository: {
    findAll: jest.fn(),
  },
}));

import { ingredientAliasRepository, ingredientRepository } from '@/services/repositories';
import { normalizeIngredientName } from '@/services/ingredientNormalizer';

const ingredients = ingredientRepository as unknown as {
  findAll: jest.Mock<() => Promise<Ingredient[]>>;
};
const aliases = ingredientAliasRepository as unknown as {
  findAll: jest.Mock<() => Promise<IngredientAlias[]>>;
};

function ingredient(id: string, name: string): Ingredient {
  return {
    id,
    name,
    category: 'Mlečni proizvodi',
    defaultUnit: 'g',
    emoji: null,
    trackPresence: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

const yogurt = ingredient('jogurt-id', 'Jogurt');

describe('normalizeIngredientName', () => {
  beforeEach(() => {
    ingredients.findAll.mockReset();
    aliases.findAll.mockReset();
    ingredients.findAll.mockResolvedValue([yogurt]);
    aliases.findAll.mockResolvedValue([]);
  });

  it('does not treat a qualified name as the shorter existing ingredient', async () => {
    const result = await normalizeIngredientName('grčki jogurt');

    expect(result.confidence).toBe('none');
    expect(result.ingredient).toBeNull();
  });

  it('does not treat a shorter name as an existing qualified ingredient', async () => {
    ingredients.findAll.mockResolvedValue([ingredient('greek-id', 'grčki jogurt')]);

    const result = await normalizeIngredientName('Jogurt');

    expect(result.confidence).toBe('none');
    expect(result.ingredient).toBeNull();
  });

  it('still matches the same ingredient ignoring case', async () => {
    const result = await normalizeIngredientName('jogurt');

    expect(result.confidence).toBe('exact');
    expect(result.ingredient?.id).toBe('jogurt-id');
  });

  it('does not auto-merge a different name stored as an alias', async () => {
    aliases.findAll.mockResolvedValue([
      {
        id: 'alias-1',
        ingredientId: 'jogurt-id',
        alias: 'grčki jogurt',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]);

    const result = await normalizeIngredientName('grčki jogurt');

    expect(result.confidence).toBe('none');
    expect(result.ingredient).toBeNull();
  });
});
