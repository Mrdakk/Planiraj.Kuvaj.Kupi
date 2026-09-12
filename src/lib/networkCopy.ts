type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error' | 'offline';

export function networkLabel(isOnline: boolean): string {
  return isOnline ? 'Na mreži' : 'Van mreže';
}

export function syncStatusLabel(syncStatus: SyncStatus, isOnline: boolean): string {
  if (syncStatus === 'synced') return 'Sinhronizovano';
  if (syncStatus === 'syncing') return 'Sinhronizacija u toku...';
  if (syncStatus === 'pending') return 'Čeka sinhronizaciju';
  if (syncStatus === 'offline' || !isOnline) return 'Van mreže';
  return 'Greška pri sinhronizaciji';
}
