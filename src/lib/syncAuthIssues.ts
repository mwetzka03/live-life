import type { AppStateService } from '../domain/services/AppStateService';
import { AppleRemindersApi } from '../domain/services/AppleRemindersApi';

export interface SyncAuthIssue {
  kind: 'caldav' | 'apple-reminders';
  accountId: string;
  accountName: string;
  appleId?: string;
  message: string;
  needsTwoFactor: boolean;
}

const AUTH_ERROR_PATTERNS = [
  /two_factor/i,
  /zwei-faktor/i,
  /unauthorized/i,
  /\b401\b/i,
  /authentication/i,
  /anmeldung/i,
  /credentials/i,
  /passwort/i,
  /password/i,
  /\b403\b/i,
  /forbidden/i,
  /no_pending_session/i,
  /invalid.*credentials/i,
];

export function isAuthRelatedSyncError(message: string | undefined): boolean {
  if (!message?.trim()) return false;
  if (AppleRemindersApi.isTwoFactorRequired(message)) return true;
  return AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function collectSyncAuthIssues(app: AppStateService): SyncAuthIssue[] {
  const issues: SyncAuthIssue[] = [];

  for (const account of app.calDavAccounts.getAll()) {
    if (!account.enabled || !account.lastSyncError) continue;
    if (!isAuthRelatedSyncError(account.lastSyncError)) continue;
    issues.push({
      kind: 'caldav',
      accountId: account.id,
      accountName: account.name,
      message: account.lastSyncError,
      needsTwoFactor: false,
    });
  }

  for (const account of app.appleRemindersAccounts.getAll()) {
    if (!account.enabled || !account.lastSyncError) continue;
    if (!isAuthRelatedSyncError(account.lastSyncError)) continue;
    const needsTwoFactor =
      AppleRemindersApi.isTwoFactorRequired(account.lastSyncError) ||
      /pending|code.*erforderlich|zwei-faktor/i.test(account.lastSyncError);
    issues.push({
      kind: 'apple-reminders',
      accountId: account.id,
      accountName: account.name,
      appleId: account.appleId,
      message: needsTwoFactor
        ? AppleRemindersApi.twoFactorMessage(account.lastSyncError)
        : account.lastSyncError,
      needsTwoFactor,
    });
  }

  return issues;
}
