import { useEffect } from 'react';
import * as Network from 'expo-network';
import { useAppStore } from '@/store/appStore';

export function useNetworkStatus() {
  const { setIsOnline } = useAppStore();

  useEffect(() => {
    let isMounted = true;

    async function check() {
      const state = await Network.getNetworkStateAsync();
      if (isMounted) {
        setIsOnline(state.isConnected ?? false);
      }
    }

    check();

    const interval = setInterval(check, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setIsOnline]);
}
