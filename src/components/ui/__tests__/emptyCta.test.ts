import { describe, expect, it } from '@jest/globals';
import { emptyCta } from '../emptyCta';

describe('emptyCta', () => {
  it('sends Fali to meal create', () => {
    expect(emptyCta.missing).toEqual({ title: 'Dodaj obrok', href: '/meals/create' });
  });

  it('sends Recepti to recipe create', () => {
    expect(emptyCta.recipes).toEqual({ title: 'Dodaj recept', href: '/recipes/create' });
  });

  it('sends Istorija to Plan', () => {
    expect(emptyCta.history).toEqual({ title: 'Idi na Plan', href: '/' });
  });
});
