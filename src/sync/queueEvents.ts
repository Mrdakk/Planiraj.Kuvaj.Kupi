type SyncQueuedListener = () => void;

let listener: SyncQueuedListener | null = null;

export function setOnSyncQueued(next: SyncQueuedListener | null): void {
  listener = next;
}

export function notifySyncQueued(): void {
  listener?.();
}
