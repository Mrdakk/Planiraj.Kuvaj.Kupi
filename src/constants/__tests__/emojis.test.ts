import { describe, expect, it } from '@jest/globals';
import { getIngredientEmoji, getRecipeEmoji, getSaltShakerContents, normalizeRecipeEmoji } from '@/constants/emojis';

describe('normalizeRecipeEmoji', () => {
  it('keeps a single food emoji', () => {
    expect(normalizeRecipeEmoji('🍝')).toBe('🍝');
  });

  it('trims extra text around an emoji', () => {
    expect(normalizeRecipeEmoji(' 🥘 ')).toBe('🥘');
  });

  it('rejects plain words', () => {
    expect(normalizeRecipeEmoji('pasta')).toBeNull();
  });

  it('rejects empty values', () => {
    expect(normalizeRecipeEmoji(null)).toBeNull();
    expect(normalizeRecipeEmoji('')).toBeNull();
  });
});

describe('getRecipeEmoji', () => {
  it('prefers a stored AI emoji over keyword matching', () => {
    expect(getRecipeEmoji('Bolonjeze špageti', '🍜')).toBe('🍜');
  });

  it('falls back to keywords when AI emoji is missing', () => {
    expect(getRecipeEmoji('Bolonjeze špageti')).toBe('🍝');
  });

  it('uses a plate when nothing matches', () => {
    expect(getRecipeEmoji('Nešto nepoznato')).toBe('🍽️');
  });
});

describe('getIngredientEmoji', () => {
  it('prefers a stored AI emoji over keyword matching', () => {
    expect(getIngredientEmoji('Beli luk', 'Povrće', '🧅')).toBe('🧅');
  });

  it('falls back to keywords when AI emoji is missing', () => {
    expect(getIngredientEmoji('Beli luk')).toBe('🧄');
  });

  it('falls back to category when name is unknown', () => {
    expect(getIngredientEmoji('Nepoznata namirnica', 'Voće')).toBe('🍎');
  });

  it('uses a basket when nothing matches', () => {
    expect(getIngredientEmoji('Nepoznata namirnica')).toBe('🧺');
  });

  it('uses the salt shaker emoji for salt, pepper, and vegeta', () => {
    expect(getIngredientEmoji('So')).toBe('🧂');
    expect(getIngredientEmoji('Biber')).toBe('🧂');
    expect(getIngredientEmoji('sol')).toBe('🧂');
    expect(getIngredientEmoji('Vegeta')).toBe('🧂');
  });

  it('still draws a pepper shaker when a heart emoji was stored', () => {
    expect(getIngredientEmoji('Biber', 'Začini', '🖤')).toBe('🖤');
    expect(getSaltShakerContents('Biber')).toBe('pepper');
  });
});

describe('getSaltShakerContents', () => {
  it('treats so and sol as white salt', () => {
    expect(getSaltShakerContents('So')).toBe('salt');
    expect(getSaltShakerContents('sol')).toBe('salt');
    expect(getSaltShakerContents('Morska so')).toBe('salt');
  });

  it('treats biber as dark pepper in the same shaker', () => {
    expect(getSaltShakerContents('Biber')).toBe('pepper');
    expect(getSaltShakerContents('Crni biber')).toBe('pepper');
  });

  it('treats vegeta as green-yellow seasoning in the same shaker', () => {
    expect(getSaltShakerContents('Vegeta')).toBe('vegeta');
    expect(getSaltShakerContents('Podravka vegeta')).toBe('vegeta');
  });

  it('does not treat soja as salt', () => {
    expect(getSaltShakerContents('Soja')).toBeNull();
  });
});
