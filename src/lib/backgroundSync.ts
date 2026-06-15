import { yieldToUi } from './loading/yieldToUi';

export interface BackgroundSyncState {
  active: boolean;
  messageKey: string;
}

type Listener = (state: BackgroundSyncState) => void;

const DEFAULT_MESSAGE_KEY = 'syncAuth.backgroundActive';

const listeners = new Set<Listener>();
let state: BackgroundSyncState = { active: false, messageKey: DEFAULT_MESSAGE_KEY };

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function setBackgroundSyncActive(active: boolean, messageKey: string = DEFAULT_MESSAGE_KEY) {
  state = { active, messageKey: active ? messageKey : DEFAULT_MESSAGE_KEY };
  notify();
}

export function subscribeBackgroundSync(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Runs without full-screen overlay – app stays usable, sync bar at top. */
export async function runBackgroundSync<T>(
  fn: () => Promise<T>,
  messageKey: string = DEFAULT_MESSAGE_KEY,
): Promise<T> {
  setBackgroundSyncActive(true, messageKey);
  await yieldToUi();
  try {
    return await fn();
  } finally {
    setBackgroundSyncActive(false);
  }
}
