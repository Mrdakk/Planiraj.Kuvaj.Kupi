import { z } from 'zod';
import { allUnits } from '@/constants/units';
import { ingredientCategories, groceryStoreSections, mealTypes } from '@/constants/categories';

export const ingredientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  category: z.enum(ingredientCategories),
  defaultUnit: z.enum(allUnits),
  trackPresence: z.boolean().default(false),
});

export const ingredientAliasSchema = z.object({
  id: z.string().uuid().optional(),
  ingredientId: z.string().uuid(),
  alias: z.string().min(1).max(200),
});

export const recipeIngredientSchema = z.object({
  id: z.string().uuid().optional(),
  recipeId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  quantity: z.number().nonnegative(),
  unit: z.enum(allUnits),
  notes: z.string().max(500).optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const recipeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  imageUri: z.string().optional(),
  baseServings: z.number().int().positive().default(4),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
  category: z.string().max(100).optional(),
  isFavorite: z.boolean().default(false),
  steps: z.array(z.string().max(2000)).default([]),
  notes: z.string().max(2000).optional(),
});

export const mealSchema = z.object({
  id: z.string().uuid().optional(),
  mealPlanId: z.string().uuid(),
  date: z.string().date(),
  mealType: z.enum(mealTypes),
  recipeId: z.string().uuid(),
  servings: z.number().int().positive().default(4),
  notes: z.string().max(500).optional(),
  isCooked: z.boolean().default(false),
});

export const mealPlanSchema = z.object({
  id: z.string().uuid().optional(),
  weekStart: z.string().date(),
});

export const pantryItemSchema = z.object({
  id: z.string().uuid().optional(),
  ingredientId: z.string().uuid(),
  quantity: z.number().nonnegative(),
  unit: z.enum(allUnits),
  expiresAt: z.string().date().optional(),
  notes: z.string().max(500).optional(),
});

export const shoppingItemSchema = z.object({
  id: z.string().uuid().optional(),
  shoppingListId: z.string().uuid(),
  ingredientId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  quantity: z.number().nonnegative(),
  unit: z.enum(allUnits),
  category: z.enum(groceryStoreSections),
  isChecked: z.boolean().default(false),
  isManual: z.boolean().default(false),
  sourceMealIds: z.array(z.string().uuid()).default([]),
  notes: z.string().max(500).optional(),
});

export const consumptionLogSchema = z.object({
  id: z.string().uuid().optional(),
  mealId: z.string().uuid(),
  ingredientId: z.string().uuid(),
  quantity: z.number().nonnegative(),
  unit: z.enum(allUnits),
  consumedAt: z.string().datetime().optional(),
});
