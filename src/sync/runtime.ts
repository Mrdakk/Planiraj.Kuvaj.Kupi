import { useAppStore } from '@/store/appStore';
import { createAutoSync } from './autoSync';
import { syncEngine } from './engine';
import { setOnSyncQueued } from './queueEvents';

export const autoSync = createAutoSync({
  sync: () => syncEngine.sync(),
  isOnline: () => useAppStore.getState().isOnline,
  setStatus: (status) => {
    if (useAppStore.getState().syncStatus === 'syncing') return;
    useAppStore.getState().setSyncStatus(status);
  },
});

setOnSyncQueued(() => autoSync.notifyLocalChange());
