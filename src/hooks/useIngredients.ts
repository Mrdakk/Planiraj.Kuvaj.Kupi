import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { invalidateAfterPantryChange } from './invalidate';
import { ingredientRepository } from '@/services/repositories';
import { needsIngredientEmojiSuggestion } from '@/constants/emojis';
import { canonicalIngredientName } from '@/lib/ingredientNames';

export function useIngredients() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.ingredients,
    queryFn: async () => {
      const ingredients = await ingredientRepository.findAll('name ASC');
      const missing = ingredients.filter((ingredient) => needsIngredientEmojiSuggestion(ingredient));
      if (missing.length > 0) {
        try {
          const { assignMissingIngredientEmojis } = await import('@/features/recipes/suggestEmojis');
          void assignMissingIngredientEmojis(missing).then((changed) => {
            if (changed) {
              queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
            }
          });
        } catch (error) {
          console.warn('Ingredient emoji assignment skipped', error);
        }
      }
      return ingredients.map((ingredient) => ({
        ...ingredient,
        name: canonicalIngredientName(ingredient.name),
      }));
    },
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: Parameters<typeof ingredientRepository.update>[0]) =>
      ingredientRepository.update(item),
    onSuccess: () => invalidateAfterPantryChange(queryClient),
  });
}
