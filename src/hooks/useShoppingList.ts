import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
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

export function useCreateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (list: ShoppingList) => shoppingListRepository.insert(list),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists });
    },
  });
}

export function useCreateShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ShoppingItem) => shoppingItemRepository.insert(item),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItems(item.shoppingListId) });
    },
  });
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ShoppingItem) => shoppingItemRepository.update(item),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItems(item.shoppingListId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItem(item.id) });
    },
  });
}

export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: ShoppingItem) => shoppingItemRepository.delete(item.id),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItems(item.shoppingListId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingItem(item.id) });
    },
  });
}
