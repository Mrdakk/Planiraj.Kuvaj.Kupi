export type AutoSyncPendingStatus = 'pending';

export interface AutoSyncDeps {
  sync: () => Promise<void>;
  isOnline: () => boolean;
  setStatus: (status: AutoSyncPendingStatus) => void;
  onComplete?: () => void;
}

export interface AutoSyncOptions {
  debounceMs?: number;
  intervalMs?: number;
}

export interface AutoSync {
  notifyLocalChange(): void;
  runNow(): Promise<void>;
  start(): void;
  pausePolling(): void;
  stop(): void;
  setOnComplete(onComplete: (() => void) | undefined): void;
}

export const DEFAULT_SYNC_DEBOUNCE_MS = 800;
export const DEFAULT_SYNC_INTERVAL_MS = 15_000;

export function createAutoSync(
  deps: AutoSyncDeps,
  options: AutoSyncOptions = {}
): AutoSync {
  const debounceMs = options.debounceMs ?? DEFAULT_SYNC_DEBOUNCE_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_SYNC_INTERVAL_MS;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let intervalTimer: ReturnType<typeof setInterval> | null = null;
  let inFlight: Promise<void> | null = null;
  let queued = false;
  let onComplete = deps.onComplete;

  function clearDebounce(): void {
    if (!debounceTimer) return;
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  async function run(): Promise<void> {
    queued = true;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      while (queued) {
        queued = false;
        if (!deps.isOnline()) continue;
        try {
          await deps.sync();
          onComplete?.();
        } catch {
          // Engine already records the error status.
        }
      }
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  }

  function schedule(): void {
    clearDebounce();
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void run();
    }, debounceMs);
  }

  function pausePolling(): void {
    if (!intervalTimer) return;
    clearInterval(intervalTimer);
    intervalTimer = null;
  }

  return {
    notifyLocalChange() {
      deps.setStatus('pending');
      schedule();
    },
    runNow() {
      clearDebounce();
      return run();
    },
    start() {
      if (intervalTimer) return;
      intervalTimer = setInterval(() => {
        void run();
      }, intervalMs);
    },
    pausePolling,
    stop() {
      pausePolling();
      clearDebounce();
    },
    setOnComplete(next) {
      onComplete = next;
    },
  };
}
