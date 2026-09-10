import { create } from 'zustand';

export interface AppState {
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'error' | 'offline';
  setIsOnline: (value: boolean) => void;
  setSyncStatus: (status: AppState['syncStatus']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  syncStatus: 'synced',
  setIsOnline: (value) => set({ isOnline: value }),
  setSyncStatus: (status) => set({ syncStatus: status }),
}));
