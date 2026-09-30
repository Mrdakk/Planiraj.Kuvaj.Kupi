import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { invalidateAfterPantryChange } from './invalidate';
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
    queryKey: [...queryKeys.pantryItems, id],
    queryFn: () => pantryItemRepository.findById(id),
    enabled: !!id,
  });
}

export function useUpdatePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: PantryItem) => pantryItemRepository.update(item),
    onSuccess: () => invalidateAfterPantryChange(queryClient),
  });
}

export function useDeletePantryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pantryItemRepository.delete(id),
    onSuccess: () => invalidateAfterPantryChange(queryClient),
  });
}
