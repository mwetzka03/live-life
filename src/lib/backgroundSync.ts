import { yieldToUi } from './loading/yieldToUi';

export interface BackgroundSyncState {
  active: boolean;
  extended: boolean;
}

type Listener = (state: BackgroundSyncState) => void;

const listeners = new Set<Listener>();
let state: BackgroundSyncState = { active: false, extended: false };

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function setBackgroundSyncActive(active: boolean, extended = false) {
  state = { active, extended: active && extended };
  notify();
}

export function subscribeBackgroundSync(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Läuft ohne Vollbild-Overlay – App bleibt bedienbar, Sync-Leiste oben. */
export async function runBackgroundSync<T>(fn: () => Promise<T>): Promise<T> {
  setBackgroundSyncActive(true, false);
  await yieldToUi();
  try {
    return await fn();
  } finally {
    setBackgroundSyncActive(false);
  }
}
