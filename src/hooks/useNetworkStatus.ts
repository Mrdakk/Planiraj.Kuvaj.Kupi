import { useEffect } from 'react';
import * as Network from 'expo-network';
import { useAppStore } from '@/store/appStore';

export function useNetworkStatus() {
  const { setIsOnline } = useAppStore();

  useEffect(() => {
    let isMounted = true;

    void Network.getNetworkStateAsync().then((state) => {
      if (isMounted) {
        setIsOnline(state.isConnected ?? false);
      }
    });

    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [setIsOnline]);
}
