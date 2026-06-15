import { getAppState } from '../domain/services/AppStateService';
import { devLog } from './startupDevLog';
import { flushSyncOutbox, pullRemoteSync } from './manualSync';

let startupSyncPromise: Promise<void> | null = null;

/** Startup sync: push outbox, then pull CalDAV + Apple Reminders (blocking, with splash). */
export async function runStartupSyncOnce(): Promise<void> {
  if (startupSyncPromise) {
    return startupSyncPromise;
  }

  startupSyncPromise = (async () => {
    const app = getAppState();
    const calDav = app.calDavAccounts.getAll().filter((a) => a.enabled && a.autoSync);
    const appleReminders = app.appleRemindersAccounts
      .getAll()
      .filter((a) => a.enabled && a.autoSync);

    devLog(
      `Startup-Sync: Outbox + ${calDav.length} CalDAV, ${appleReminders.length} Apple Reminders`,
      'info',
      'Boot',
    );

    await flushSyncOutbox();
    await pullRemoteSync();
  })();

  try {
    await startupSyncPromise;
  } finally {
    startupSyncPromise = null;
  }
}
