import { getAppState } from '../domain/services/AppStateService';
import { isTauriApp } from '../domain/services/CalDavApi';
import { yieldToUi } from './loading/yieldToUi';
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

async function flushSyncOutboxInternal(): Promise<void> {
  if (!isTauriApp() || flushRunning) return;
  flushRunning = true;
  try {
    const app = getAppState();
    await app.processSyncOutbox();
    await yieldToUi();
  } finally {
    flushRunning = false;
  }
}

async function pullRemoteSyncInternal(): Promise<void> {
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
    await yieldToUi();
  }
  for (const account of apple) {
    try {
      await app.syncAppleRemindersAccount(account.id);
    } catch {
      // logged in sync service
    }
    await yieldToUi();
  }
}

/** Push queued iCloud/CalDAV changes to remote services. */
export async function flushSyncOutbox(): Promise<void> {
  const app = getAppState();
  app.beginBulkSync();
  try {
    await flushSyncOutboxInternal();
  } finally {
    app.endBulkSync();
  }
}

/** Pull from CalDAV + Apple Reminders (all enabled accounts with autoSync). */
export async function pullRemoteSync(): Promise<void> {
  const app = getAppState();
  app.beginBulkSync();
  try {
    await pullRemoteSyncInternal();
  } finally {
    app.endBulkSync();
  }
}

/** Push cached local changes only (outbox flush). */
export async function runUploadSync(): Promise<void> {
  if (!isTauriApp() || manualSyncRunning) return;
  manualSyncRunning = true;
  const app = getAppState();
  app.beginBulkSync();
  try {
    devLog('Upload-Sync gestartet', 'info', 'Sync');
    await yieldToUi();
    await flushSyncOutboxInternal();
    devLog('Upload-Sync abgeschlossen', 'ok', 'Sync');
  } finally {
    app.endBulkSync();
    manualSyncRunning = false;
  }
}

/** Manual refresh: push pending changes, then pull remote updates. */
export async function runManualSync(): Promise<void> {
  if (!isTauriApp() || manualSyncRunning) return;
  manualSyncRunning = true;
  const app = getAppState();
  app.beginBulkSync();
  try {
    devLog('Manueller Sync gestartet', 'info', 'Sync');
    await yieldToUi();
    await flushSyncOutboxInternal();
    await yieldToUi();
    await pullRemoteSyncInternal();
    devLog('Manueller Sync abgeschlossen', 'ok', 'Sync');
  } finally {
    app.endBulkSync();
    manualSyncRunning = false;
  }
}
