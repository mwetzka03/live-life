import { getAppState } from '../domain/services/AppStateService';
import { devLog } from './startupDevLog';
import { flushSyncOutbox } from './manualSync';

let startupSyncPromise: Promise<void> | null = null;

export async function runStartupSyncOnce(): Promise<void> {
  if (startupSyncPromise) {
    return startupSyncPromise;
  }

  startupSyncPromise = (async () => {
    await flushSyncOutbox();

    const app = getAppState();
    const calDav = app.calDavAccounts.getAll().filter((a) => a.enabled && a.autoSync);
    const appleReminders = app.appleRemindersAccounts
      .getAll()
      .filter((a) => a.enabled && a.autoSync);

    devLog(
      `Startup-Sync: ${calDav.length} CalDAV-Konto(en), ${appleReminders.length} Apple-Reminders-Konto(en)`,
      'info',
      'Boot',
    );

    for (const account of calDav) {
      try {
        await app.syncCalDavAccount(account.id);
      } catch {
        // Details im Dev-Log (Sync-Kontext)
      }
    }

    for (const account of appleReminders) {
      try {
        await app.syncAppleRemindersAccount(account.id);
      } catch {
        // Details im Dev-Log (Sync-Kontext)
      }
    }
  })();

  try {
    await startupSyncPromise;
  } finally {
    startupSyncPromise = null;
  }
}
