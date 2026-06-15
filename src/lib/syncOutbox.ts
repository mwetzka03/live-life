import { devLog } from './startupDevLog';

const STORAGE_KEY = 'live-life-sync-outbox';

export type ICloudStatusOutboxEntry = {
  type: 'icloud-status';
  id: string;
  challengeId: string;
  completed: boolean;
  queuedAt: string;
};

export type ICloudCreateOutboxEntry = {
  type: 'icloud-create';
  id: string;
  challengeId: string;
  sourceId: string;
  queuedAt: string;
};

export type ICloudCreateGroupOutboxEntry = {
  type: 'icloud-create-group';
  id: string;
  groupId: string;
  sourceId: string;
  queuedAt: string;
};

export type ICloudDeleteOutboxEntry = {
  type: 'icloud-delete';
  id: string;
  accountId: string;
  listGuid: string;
  href: string;
  queuedAt: string;
};

export type SyncOutboxEntry =
  | ICloudStatusOutboxEntry
  | ICloudCreateOutboxEntry
  | ICloudCreateGroupOutboxEntry
  | ICloudDeleteOutboxEntry;

function loadRaw(): SyncOutboxEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SyncOutboxEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let outboxListeners = new Set<() => void>();

function notifyOutboxListeners(): void {
  for (const listener of outboxListeners) {
    listener();
  }
}

export function subscribeSyncOutbox(listener: () => void): () => void {
  outboxListeners.add(listener);
  return () => outboxListeners.delete(listener);
}

function saveRaw(entries: SyncOutboxEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  notifyOutboxListeners();
}

export function getSyncOutbox(): SyncOutboxEntry[] {
  return loadRaw();
}

export function getSyncOutboxCount(): number {
  return loadRaw().length;
}

function upsert(entry: SyncOutboxEntry): void {
  const entries = loadRaw();
  const index = entries.findIndex((e) => e.id === entry.id);
  if (index === -1) {
    entries.push(entry);
  } else {
    entries[index] = entry;
  }
  saveRaw(entries);
}

export function enqueueICloudStatus(challengeId: string, completed: boolean): void {
  upsert({
    type: 'icloud-status',
    id: `status:${challengeId}`,
    challengeId,
    completed,
    queuedAt: new Date().toISOString(),
  });
  devLog(
    `iCloud-Update geplant: Challenge ${challengeId} → ${completed ? 'erledigt' : 'offen'}`,
    'info',
    'SyncOutbox',
  );
}

export function enqueueICloudCreate(challengeId: string, sourceId: string): void {
  upsert({
    type: 'icloud-create',
    id: `create:${challengeId}`,
    challengeId,
    sourceId,
    queuedAt: new Date().toISOString(),
  });
  devLog(`iCloud-Erstellung geplant: Challenge ${challengeId}`, 'info', 'SyncOutbox');
}

export function enqueueICloudCreateGroup(groupId: string, sourceId: string): void {
  upsert({
    type: 'icloud-create-group',
    id: `create-group:${groupId}`,
    groupId,
    sourceId,
    queuedAt: new Date().toISOString(),
  });
  devLog(`iCloud-Gruppe geplant: ${groupId}`, 'info', 'SyncOutbox');
}

export function enqueueICloudDelete(accountId: string, listGuid: string, href: string): void {
  upsert({
    type: 'icloud-delete',
    id: `delete:${href}`,
    accountId,
    listGuid,
    href,
    queuedAt: new Date().toISOString(),
  });
  devLog(`iCloud-Löschung geplant: ${href}`, 'info', 'SyncOutbox');
}

export function removeOutboxEntry(id: string): void {
  saveRaw(loadRaw().filter((e) => e.id !== id));
}

export function clearSyncOutbox(): void {
  localStorage.removeItem(STORAGE_KEY);
  notifyOutboxListeners();
}
