import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import { autoSync } from '@/sync/runtime';

export function useAutoSync() {
  const queryClient = useQueryClient();
  const isOnline = useAppStore((state) => state.isOnline);
  const wasOnline = useRef(isOnline);

  useEffect(() => {
    autoSync.setOnComplete(() => {
      void queryClient.invalidateQueries();
    });

    autoSync.start();
    void autoSync.runNow();

    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        autoSync.start();
        void autoSync.runNow();
        return;
      }
      autoSync.pausePolling();
    });

    return () => {
      subscription.remove();
      autoSync.setOnComplete(undefined);
      autoSync.stop();
    };
  }, [queryClient]);

  useEffect(() => {
    const cameOnline = isOnline && !wasOnline.current;
    wasOnline.current = isOnline;
    if (cameOnline) {
      void autoSync.runNow();
    }
  }, [isOnline]);
}
