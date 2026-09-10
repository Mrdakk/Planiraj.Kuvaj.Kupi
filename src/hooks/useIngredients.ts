import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { ingredientRepository } from '@/services/repositories';
import { normalizeRecipeEmoji } from '@/constants/emojis';
import { canonicalIngredientName } from '@/lib/ingredientNames';

export function useIngredients() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.ingredients,
    queryFn: async () => {
      const ingredients = await ingredientRepository.findAll('name ASC');
      const missing = ingredients.filter((ingredient) => !normalizeRecipeEmoji(ingredient.emoji));
      if (missing.length > 0) {
        const { assignMissingIngredientEmojis } = await import('@/features/recipes/suggestEmojis');
        void assignMissingIngredientEmojis(missing).then((changed) => {
          if (changed) {
            queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
          }
        });
      }
      return ingredients.map((ingredient) => ({
        ...ingredient,
        name: canonicalIngredientName(ingredient.name),
      }));
    },
  });
}

export function useIngredient(id: string) {
  return useQuery({
    queryKey: queryKeys.ingredient(id),
    queryFn: () => ingredientRepository.findById(id),
    enabled: !!id,
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: Parameters<typeof ingredientRepository.update>[0]) =>
      ingredientRepository.update(item),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredient(item.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.missing });
    },
  });
}
