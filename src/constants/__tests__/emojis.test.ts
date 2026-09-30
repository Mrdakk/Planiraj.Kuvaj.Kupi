import { describe, expect, it } from '@jest/globals';
import { sameIngredientKey } from '@/constants/ingredientEmojis';
import {
  getIngredientEmoji,
  getRecipeEmoji,
  getSaltShakerContents,
  isAllowedIngredientEmoji,
  needsIngredientEmojiSuggestion,
  normalizeRecipeEmoji,
} from '@/constants/emojis';

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
  it('uses the dictionary ahead of a stored AI emoji', () => {
    expect(getIngredientEmoji('Beli luk', 'Povrće', '🧅', 'ai')).toBe('🧄');
    expect(getIngredientEmoji('Beli luk', 'Povrće', '🧅')).toBe('🧄');
  });

  it('lets a manual choice beat the dictionary', () => {
    expect(getIngredientEmoji('Beli luk', 'Povrće', '🧅', 'user')).toBe('🧅');
  });

  it('falls back to keywords when AI emoji is missing', () => {
    expect(getIngredientEmoji('Beli luk')).toBe('🧄');
  });

  it('matches whole words so similar names keep their own icon', () => {
    expect(getIngredientEmoji('Sirće')).toBe('🫙');
    expect(getIngredientEmoji('Sočivo')).toBe('🫘');
    expect(getIngredientEmoji('Soja sos')).toBe('🫙');
    expect(getIngredientEmoji('Praziluk')).toBe('🥬');
    expect(getIngredientEmoji('Papar')).toBe('🧂');
  });

  it('knows common Serbian and Croatian pantry names', () => {
    expect(getIngredientEmoji('Belog luka')).toBe('🧄');
    expect(getIngredientEmoji('Češnjak')).toBe('🧄');
    expect(getIngredientEmoji('Crnog luka')).toBe('🧅');
    expect(getIngredientEmoji('Šargarepa')).toBe('🥕');
    expect(getIngredientEmoji('Mrkva')).toBe('🥕');
    expect(getIngredientEmoji('Tikvica')).toBe('🥒');
    expect(getIngredientEmoji('Spanać')).toBe('🥬');
    expect(getIngredientEmoji('Špinat')).toBe('🥬');
    expect(getIngredientEmoji('Celer')).toBe('🥬');
    expect(getIngredientEmoji('Kupus')).toBe('🥬');
    expect(getIngredientEmoji('Kajmak')).toBe('🧀');
    expect(getIngredientEmoji('Jogurt')).toBe('🥛');
    expect(getIngredientEmoji('Puter')).toBe('🧈');
    expect(getIngredientEmoji('Maslac')).toBe('🧈');
    expect(getIngredientEmoji('Šećer')).toBe('🍬');
    expect(getIngredientEmoji('Med')).toBe('🍯');
    expect(getIngredientEmoji('Limun')).toBe('🍋');
    expect(getIngredientEmoji('Cimet')).toBe('🟤');
    expect(getIngredientEmoji('Ocat')).toBe('🫙');
    expect(getIngredientEmoji('Kečap')).toBe('🍅');
    expect(getIngredientEmoji('Maslinovo ulje')).toBe('🫒');
    expect(getIngredientEmoji('Krumpir')).toBe('🥔');
    expect(getIngredientEmoji('Riža')).toBe('🍚');
  });

  it('ignores a stored emoji that is not on the ingredient list', () => {
    expect(getIngredientEmoji('Biber', 'Začini', '🖤')).toBe('🧂');
    expect(getSaltShakerContents('Biber')).toBe('pepper');
    expect(getIngredientEmoji('Nepoznata namirnica', 'Voće', '🖤', 'ai')).toBe('🍎');
  });

  it('keeps an allowed stored emoji when the name is unknown', () => {
    expect(getIngredientEmoji('Nepoznata namirnica', 'Voće', '🥑', 'ai')).toBe('🥑');
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
});

describe('needsIngredientEmojiSuggestion', () => {
  it('skips names the dictionary already knows', () => {
    expect(needsIngredientEmojiSuggestion({ name: 'Beli luk', emoji: null })).toBe(false);
  });

  it('skips a manual choice', () => {
    expect(
      needsIngredientEmojiSuggestion({ name: 'Nešto', emoji: '🥑', emojiSource: 'user' })
    ).toBe(false);
  });

  it('asks only when the name is unknown and no allowed emoji is stored', () => {
    expect(needsIngredientEmojiSuggestion({ name: 'Nešto retko', emoji: null })).toBe(true);
    expect(
      needsIngredientEmojiSuggestion({ name: 'Nešto retko', emoji: '🖤', emojiSource: 'ai' })
    ).toBe(true);
    expect(
      needsIngredientEmojiSuggestion({ name: 'Nešto retko', emoji: '🥑', emojiSource: 'ai' })
    ).toBe(false);
  });
});

describe('sameIngredientKey', () => {
  it('treats names as the same when only diacritics differ', () => {
    expect(sameIngredientKey('Šargarepa', 'Sargarepa')).toBe(true);
    expect(sameIngredientKey('Sočivo', 'Pasulj')).toBe(false);
  });
});

describe('isAllowedIngredientEmoji', () => {
  it('accepts catalog emojis and rejects anything else', () => {
    expect(isAllowedIngredientEmoji('🥕')).toBe(true);
    expect(isAllowedIngredientEmoji('🌶')).toBe(true);
    expect(isAllowedIngredientEmoji('🖤')).toBe(false);
    expect(isAllowedIngredientEmoji('šargarepa')).toBe(false);
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
