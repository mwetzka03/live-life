import { EMPTY_APP_DATA, type AppData } from '../domain/models/AppData';
import { LocalStorageRepository } from '../domain/repositories/LocalStorageRepository';
import { normalizeAppData } from '../domain/services/AppStateService';
import { LOCALE_STORAGE_KEY } from '../i18n/types';

export const BACKUP_FORMAT = 'live-life-backup' as const;
export const DATA_STORAGE_KEY = 'live-life-data';

export interface LiveLifeBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  appData: AppData;
  preferences?: {
    locale?: string;
    theme?: string;
  };
}

export function hasStoredAppData(): boolean {
  return localStorage.getItem(DATA_STORAGE_KEY) !== null;
}

export function buildBackup(appData: AppData): LiveLifeBackup {
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    appData,
    preferences: {
      locale: localStorage.getItem(LOCALE_STORAGE_KEY) ?? undefined,
      theme: localStorage.getItem('live-life-theme') ?? undefined,
    },
  };
}

export function parseBackup(raw: unknown): LiveLifeBackup {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file');
  }
  const obj = raw as Partial<LiveLifeBackup>;
  if (obj.format !== BACKUP_FORMAT || !obj.appData) {
    throw new Error('Invalid backup format');
  }
  return {
    format: BACKUP_FORMAT,
    version: obj.version ?? 1,
    exportedAt: obj.exportedAt ?? new Date().toISOString(),
    appData: normalizeAppData(obj.appData),
    preferences: obj.preferences,
  };
}

export function saveBackupToStorage(backup: LiveLifeBackup): void {
  const repo = new LocalStorageRepository();
  repo.save(backup.appData);
  if (backup.preferences?.locale) {
    localStorage.setItem(LOCALE_STORAGE_KEY, backup.preferences.locale);
  }
  if (backup.preferences?.theme) {
    localStorage.setItem('live-life-theme', backup.preferences.theme);
  }
}

export function clearAppDataKeepSyncAccounts(): void {
  const repo = new LocalStorageRepository();
  const current = repo.load();
  const calDavAccounts = current?.calDavAccounts ?? [];
  const appleRemindersAccounts = current?.appleRemindersAccounts ?? [];
  repo.save({
    ...EMPTY_APP_DATA,
    calDavAccounts,
    appleRemindersAccounts,
  });
}

export function resetAppCompletely(): void {
  localStorage.removeItem(DATA_STORAGE_KEY);
  localStorage.removeItem(LOCALE_STORAGE_KEY);
  localStorage.removeItem('live-life-theme');
  localStorage.removeItem('live-life-dev-mode');
}

export function downloadBackupFile(backup: LiveLifeBackup): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `live-life-backup-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function reloadApp(): void {
  window.location.reload();
}

export function persistInitialAppState(appData: AppData): void {
  const repo = new LocalStorageRepository();
  repo.save(normalizeAppData(appData));
}
