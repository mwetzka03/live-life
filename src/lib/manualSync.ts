import { getAppState } from '../domain/services/AppStateService';
import { isTauriApp } from '../domain/services/CalDavApi';
import { devLog } from './startupDevLog';
import { getSyncOutboxCount } from './syncOutbox';

let manualSyncRunning = false;
let flushRunning = false;

export function isManualSyncRunning(): boolean {
  return manualSyncRunning;
}

export function hasPendingSyncOutbox(): boolean {
  return getSyncOutboxCount() > 0;
}

/** Push queued iCloud/CalDAV changes to remote services. */
export async function flushSyncOutbox(): Promise<void> {
  if (!isTauriApp() || flushRunning) return;
  flushRunning = true;
  try {
    const app = getAppState();
    await app.processSyncOutbox();
  } finally {
    flushRunning = false;
  }
}

/** Pull from CalDAV + Apple Reminders (all enabled accounts with autoSync). */
export async function pullRemoteSync(): Promise<void> {
  if (!isTauriApp()) return;
  const app = getAppState();
  const calDav = app.calDavAccounts.getAll().filter((a) => a.enabled && a.autoSync);
  const apple = app.appleRemindersAccounts.getAll().filter((a) => a.enabled && a.autoSync);

  devLog(
    `Pull-Sync: ${calDav.length} CalDAV, ${apple.length} Apple Reminders`,
    'info',
    'Sync',
  );

  for (const account of calDav) {
    try {
      await app.syncCalDavAccount(account.id);
    } catch {
      // logged in sync service
    }
  }
  for (const account of apple) {
    try {
      await app.syncAppleRemindersAccount(account.id);
    } catch {
      // logged in sync service
    }
  }
}

/** Manual refresh: push pending changes, then pull remote updates. */
export async function runManualSync(): Promise<void> {
  if (!isTauriApp() || manualSyncRunning) return;
  manualSyncRunning = true;
  try {
    devLog('Manueller Sync gestartet', 'info', 'Sync');
    await flushSyncOutbox();
    await pullRemoteSync();
    devLog('Manueller Sync abgeschlossen', 'ok', 'Sync');
  } finally {
    manualSyncRunning = false;
  }
}

export async function flushSyncOnAppClose(): Promise<void> {
  if (!isTauriApp() || !hasPendingSyncOutbox()) return;
  devLog('App wird geschlossen – Sync-Outbox wird geleert…', 'info', 'Sync');
  await flushSyncOutbox();
}
