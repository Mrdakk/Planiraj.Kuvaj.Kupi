import { describe, expect, it } from '@jest/globals';
import { recipeFormToInput, type RecipeFormData } from '../recipeFormInput';

function form(overrides: Partial<RecipeFormData> = {}): RecipeFormData {
  return {
    name: 'Palačinke',
    description: '',
    baseServings: '4',
    prepTimeMinutes: '',
    mealTypes: ['Doručak'],
    dishType: '',
    steps: 'Umuti\n\n  Peci  ',
    notes: '',
    ingredients: [{ rawName: 'Brašno', quantity: '250', unit: 'g', notes: '' }],
    ...overrides,
  };
}

describe('recipeFormToInput', () => {
  it('builds the service input from a valid form', () => {
    const { input, errors } = recipeFormToInput(form({ baseServings: '1,5', prepTimeMinutes: '20' }));

    expect(errors).toEqual({ ingredientRows: {} });
    expect(input).toMatchObject({
      name: 'Palačinke',
      baseServings: 1.5,
      prepTimeMinutes: 20,
      steps: ['Umuti', 'Peci'],
      ingredients: [{ rawName: 'Brašno', quantity: 250, unit: 'g' }],
    });
  });

  it('requires a name', () => {
    const { input, errors } = recipeFormToInput(form({ name: '   ' }));
    expect(input).toBeNull();
    expect(errors.name).toBeDefined();
  });

  it('rejects servings below one and invalid prep time', () => {
    const { errors } = recipeFormToInput(form({ baseServings: '0', prepTimeMinutes: 'brzo' }));
    expect(errors.baseServings).toBeDefined();
    expect(errors.prepTimeMinutes).toBeDefined();
  });

  it('requires at least one named ingredient and skips blank template rows', () => {
    const { errors } = recipeFormToInput(
      form({ ingredients: [{ rawName: '', quantity: '', unit: 'kom', notes: '' }] })
    );
    expect(errors.ingredients).toBeDefined();
  });

  it('flags ingredient rows with a missing name or a non-positive quantity', () => {
    const { input, errors } = recipeFormToInput(
      form({
        ingredients: [
          { rawName: 'Brašno', quantity: '0', unit: 'g', notes: '' },
          { rawName: '', quantity: '2', unit: 'kom', notes: '' },
          { rawName: 'Jaja', quantity: '2', unit: 'kom', notes: '' },
        ],
      })
    );
    expect(input).toBeNull();
    expect(Object.keys(errors.ingredientRows).sort()).toEqual(['0', '1']);
  });
});
