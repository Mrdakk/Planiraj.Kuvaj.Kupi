import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { pantryItemRepository } from '@/services/repositories';
import type { PantryItem } from '@/types';

export function usePantryItems() {
  return useQuery({
    queryKey: queryKeys.pantryItems,
    queryFn: () => pantryItemRepository.findAll(),
  });
}

export function usePantryItem(id: string) {
  return useQuery({
    queryKey: ['pantryItems', id],
    queryFn: () => pantryItemRepository.findById(id),
    enabled: !!id,
  });
}

export function useCreatePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: PantryItem) => pantryItemRepository.insert(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems });
    },
  });
}

export function useUpdatePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: PantryItem) => pantryItemRepository.update(item),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems });
      queryClient.invalidateQueries({ queryKey: ['pantryItems', item.id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.missing });
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredients });
    },
  });
}

export function useDeletePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pantryItemRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pantryItems });
    },
  });
}
