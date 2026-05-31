import { useEffect, useRef } from 'react';
import { isTauriApp } from '../domain/services/CalDavApi';
import { getAppState } from '../domain/services/AppStateService';
import { translate } from '../i18n/translate';
import { LOCALE_STORAGE_KEY, type Locale } from '../i18n/types';
import { devLog } from '../lib/startupDevLog';
import { runStartupSyncOnce } from '../lib/startupSync';
import { useStartupSplash } from '../lib/startupSplash/StartupSplashProvider';
import { yieldToUi } from '../lib/loading/yieldToUi';

function bootT(key: string) {
  const loc = (localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'de') as Locale;
  return translate(loc, key);
}

const MIN_WELCOME_MS = 500;

let bootCompleted = false;
const bootCompleteListeners = new Set<() => void>();

function notifyBootComplete() {
  bootCompleted = true;
  for (const listener of bootCompleteListeners) {
    listener();
  }
}

export function isAppBootComplete(): boolean {
  return bootCompleted;
}

export function subscribeAppBootComplete(listener: () => void): () => void {
  bootCompleteListeners.add(listener);
  if (bootCompleted) listener();
  return () => bootCompleteListeners.delete(listener);
}

export function useAppBoot() {
  const splash = useStartupSplash();
  const splashRef = useRef(splash);
  splashRef.current = splash;

  useEffect(() => {
    if (bootCompleted) return;

    let cancelled = false;

    void (async () => {
      devLog('Boot gestartet', 'info', 'Boot');
      splashRef.current.show(bootT('boot.starting'));
      await yieldToUi();

      devLog('Lade lokalen App-State…', 'info', 'Boot');
      const welcomeStart = Date.now();
      const app = getAppState();
      app.repairReminderChallengeLinks();
      devLog(
        `State geladen: ${app.challenges.getAll().length} Challenges, ${app.calendar.getAll().length} Termine, ${app.appleRemindersAccounts.getAll().length} Apple-Konten`,
        'ok',
        'Boot',
      );

      const calDavAuto = app.calDavAccounts.getAll().filter((a) => a.enabled && a.autoSync);
      const appleAuto = app.appleRemindersAccounts.getAll().filter((a) => a.enabled && a.autoSync);
      const hasAutoSync = isTauriApp() && (calDavAuto.length > 0 || appleAuto.length > 0);

      if (hasAutoSync) {
        splashRef.current.updateMessage(bootT('boot.syncing'));
        devLog(
          `Auto-Sync aktiv: ${calDavAuto.length} CalDAV, ${appleAuto.length} Apple Reminders`,
          'info',
          'Boot',
        );
        await yieldToUi();
        await runStartupSyncOnce();
        devLog('Startup-Sync abgeschlossen', 'ok', 'Boot');
      } else {
        devLog('Kein Auto-Sync konfiguriert – übersprungen', 'info', 'Boot');
      }

      if (cancelled) return;

      const elapsed = Date.now() - welcomeStart;
      if (elapsed < MIN_WELCOME_MS) {
        devLog(`Mindest-Anzeige: ${MIN_WELCOME_MS - elapsed}ms`, 'info', 'Boot');
        await new Promise((resolve) => setTimeout(resolve, MIN_WELCOME_MS - elapsed));
      }

      if (cancelled) return;

      devLog('Boot abgeschlossen – UI wird eingeblendet', 'ok', 'Boot');
      splashRef.current.hide();
      notifyBootComplete();
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
