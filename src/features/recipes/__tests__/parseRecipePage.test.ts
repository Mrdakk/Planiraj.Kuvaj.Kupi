import { describe, expect, it } from '@jest/globals';
import {
  draftToRecipe,
  extractRecipeDraftFromHtml,
  htmlToPlainText,
  isoDurationToMinutes,
  parseIngredientLine,
} from '../../../../supabase/functions/import-recipe/parsePage';

const jsonLdScript = (payload: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;

describe('isoDurationToMinutes', () => {
  it('parses hours and minutes', () => {
    expect(isoDurationToMinutes('PT1H30M')).toBe(90);
    expect(isoDurationToMinutes('PT45M')).toBe(45);
    expect(isoDurationToMinutes('PT2H')).toBe(120);
  });

  it('returns null for empty or invalid values', () => {
    expect(isoDurationToMinutes(undefined)).toBeNull();
    expect(isoDurationToMinutes('not-a-duration')).toBeNull();
  });
});

describe('extractRecipeDraftFromHtml', () => {
  it('reads a Recipe node nested in @graph', () => {
    const html = `<html><head>${jsonLdScript({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Article' },
        {
          '@type': 'Recipe',
          name: 'Musaka',
          description: 'Klasična musaka',
          recipeYield: '4 porcije',
          totalTime: 'PT1H15M',
          recipeCategory: 'Ručak',
          recipeIngredient: ['500 g mlevenog mesa', '4 krompira'],
          recipeInstructions: [
            { '@type': 'HowToStep', text: 'Zapeći meso.' },
            { '@type': 'HowToStep', text: 'Složiti krompir.' },
          ],
        },
      ],
    })}</head><body><p>navigacija</p></body></html>`;

    expect(extractRecipeDraftFromHtml(html)).toEqual({
      name: 'Musaka',
      description: 'Klasična musaka',
      baseServings: 4,
      prepTimeMinutes: 75,
      category: 'Ručak',
      steps: ['Zapeći meso.', 'Složiti krompir.'],
      ingredients: ['500 g mlevenog mesa', '4 krompira'],
    });
  });

  it('flattens HowToSection instructions and yield as a number', () => {
    const html = jsonLdScript({
      '@type': ['Recipe', 'NewsArticle'],
      name: 'Palačinke',
      recipeYield: 6,
      prepTime: 'PT10M',
      cookTime: 'PT20M',
      recipeIngredient: ['2 jaja', { name: 'mleko', amount: '250 ml' }],
      recipeInstructions: {
        '@type': 'HowToSection',
        itemListElement: [
          { '@type': 'HowToStep', name: 'Mešanje', text: 'Umutiti testo.' },
          { '@type': 'HowToStep', text: 'Peći na tiganju.' },
        ],
      },
    });

    const draft = extractRecipeDraftFromHtml(html);
    expect(draft?.name).toBe('Palačinke');
    expect(draft?.baseServings).toBe(6);
    expect(draft?.prepTimeMinutes).toBe(30);
    expect(draft?.ingredients).toEqual(['2 jaja', '250 ml mleko']);
    expect(draft?.steps).toEqual(['Umutiti testo.', 'Peći na tiganju.']);
  });

  it('returns null when the page has no Recipe markup', () => {
    const html = `<html><head>${jsonLdScript({
      '@type': 'Article',
      name: 'Vesti',
    })}</head><body><p>Nema recepta.</p></body></html>`;

    expect(extractRecipeDraftFromHtml(html)).toBeNull();
  });
});

describe('htmlToPlainText', () => {
  it('strips scripts and tags, keeping visible copy', () => {
    const text = htmlToPlainText(
      '<html><head><script>alert(1)</script><style>p{color:red}</style></head><body><h1>Musaka</h1><p>500 g mesa</p></body></html>'
    );
    expect(text).toContain('Musaka');
    expect(text).toContain('500 g mesa');
    expect(text).not.toContain('alert(1)');
    expect(text).not.toContain('color:red');
  });
});

describe('parseIngredientLine', () => {
  it('splits quantity, unit and name', () => {
    expect(parseIngredientLine('500 g mlevenog mesa')).toEqual({
      rawName: 'mlevenog mesa',
      quantity: 500,
      unit: 'g',
      notes: '',
    });
    expect(parseIngredientLine('2 glavice crnog luka')).toEqual({
      rawName: 'crnog luka',
      quantity: 2,
      unit: 'glavica',
      notes: '',
    });
    expect(parseIngredientLine('1 kašičica aleve paprike')).toEqual({
      rawName: 'aleve paprike',
      quantity: 1,
      unit: 'kašičica',
      notes: '',
    });
  });

  it('treats a bare count as kom', () => {
    expect(parseIngredientLine('4 krompira')).toEqual({
      rawName: 'krompira',
      quantity: 4,
      unit: 'kom',
      notes: '',
    });
    expect(parseIngredientLine('so')).toEqual({
      rawName: 'so',
      quantity: 1,
      unit: 'kom',
      notes: '',
    });
  });
});

describe('draftToRecipe', () => {
  it('maps a JSON-LD draft into the import payload', () => {
    const recipe = draftToRecipe({
      name: 'Musaka',
      description: 'Klasična musaka',
      baseServings: 4,
      prepTimeMinutes: 75,
      category: 'Ručak',
      steps: ['Zapeći meso.', 'Složiti krompir.'],
      ingredients: ['500 g mlevenog mesa', '4 krompira'],
    });

    expect(recipe.name).toBe('Musaka');
    expect(recipe.baseServings).toBe(4);
    expect(recipe.prepTimeMinutes).toBe(75);
    expect(recipe.ingredients).toEqual([
      { rawName: 'mlevenog mesa', quantity: 500, unit: 'g', notes: '' },
      { rawName: 'krompira', quantity: 4, unit: 'kom', notes: '' },
    ]);
  });
});
