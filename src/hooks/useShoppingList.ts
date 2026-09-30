import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { invalidateAfterShoppingChange } from './invalidate';
import { shoppingListRepository, shoppingItemRepository } from '@/services/repositories';
import type { ShoppingItem, ShoppingList } from '@/types';

export function useShoppingList(weekStart: string) {
  return useQuery<ShoppingList | null>({
    queryKey: queryKeys.shoppingList(weekStart),
    queryFn: async () => {
      const lists = await shoppingListRepository.findManyWhere('week_start = ?', [weekStart]);
      return lists[0] ?? null;
    },
  });
}

export function useShoppingItems(listId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shoppingItems(listId ?? ''),
    queryFn: () => shoppingItemRepository.findManyWhere('shopping_list_id = ?', [listId ?? '']),
    enabled: !!listId,
  });
}

export function useShoppingItem(id: string) {
  return useQuery({
    queryKey: queryKeys.shoppingItem(id),
    queryFn: () => shoppingItemRepository.findById(id),
    enabled: !!id,
  });
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ShoppingItem) => shoppingItemRepository.update(item),
    onSuccess: () => invalidateAfterShoppingChange(queryClient),
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ShoppingItem) => shoppingItemRepository.delete(item.id),
    onSuccess: () => invalidateAfterShoppingChange(queryClient),
  });
}
