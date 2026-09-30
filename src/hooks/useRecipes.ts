import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import {
  recipeRepository,
  recipeIngredientRepository,
  ingredientRepository,
} from '@/services/repositories';
import { normalizeRecipeEmoji } from '@/constants/emojis';
import { displayIngredientName } from '@/lib/ingredientNames';
import { deleteRecipe } from '@/features/recipes/deleteRecipe';
import { invalidateAfterRecipeChange } from './invalidate';
import type { Recipe, RecipeIngredient, RecipeWithIngredients } from '@/types';

export function useRecipes() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.recipes,
    queryFn: async () => {
      const recipes = await recipeRepository.findAll('name ASC');
      const missing = recipes.filter((recipe) => !normalizeRecipeEmoji(recipe.emoji));
      if (missing.length > 0) {
        try {
          const { assignMissingRecipeEmojis } = await import('@/features/recipes/suggestEmojis');
          void assignMissingRecipeEmojis(missing).then((changed) => {
            if (changed) {
              queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
            }
          });
        } catch (error) {
          console.warn('Recipe emoji assignment skipped', error);
        }
      }
      return recipes;
    },
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: queryKeys.recipe(id),
    queryFn: async () => {
      const recipe = await recipeRepository.findById(id);
      if (!recipe) return null;
      const ingredients = await recipeIngredientRepository.findManyWhere(
        'recipe_id = ?',
        [id]
      );
      const allIngredients = await ingredientRepository.findAll();
      const nameById = new Map(allIngredients.map((item) => [item.id, item.name]));
      return {
        ...recipe,
        ingredients: ingredients.map((item) => ({
          ...item,
          ingredientName: displayIngredientName(nameById.get(item.ingredientId)),
        })),
      } as RecipeWithIngredients;
    },
    enabled: !!id,
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRecipe(id),
    onSuccess: () => invalidateAfterRecipeChange(queryClient),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipe: Recipe) => {
      const updated = { ...recipe, isFavorite: !recipe.isFavorite };
      await recipeRepository.update(updated);
      return updated;
    },
    onSuccess: (_, recipe) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipes });
      queryClient.invalidateQueries({ queryKey: queryKeys.recipe(recipe.id) });
    },
  });
}

export function useAllRecipeIngredients() {
  return useQuery({
    queryKey: queryKeys.recipeIngredientsAll,
    queryFn: () => recipeIngredientRepository.findAll(),
  });
}

export type { RecipeIngredient };
