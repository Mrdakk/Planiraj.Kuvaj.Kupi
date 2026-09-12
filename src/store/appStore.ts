import { create } from 'zustand';
import { getWeekStart } from '@/features/planner/service';

export interface AppState {
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'error' | 'offline';
  planWeekStart: string;
  setIsOnline: (value: boolean) => void;
  setSyncStatus: (status: AppState['syncStatus']) => void;
  setPlanWeekStart: (weekStart: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  syncStatus: 'synced',
  planWeekStart: getWeekStart(new Date()),
  setIsOnline: (value) => set({ isOnline: value }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setPlanWeekStart: (weekStart) => set({ planWeekStart: weekStart }),
}));
