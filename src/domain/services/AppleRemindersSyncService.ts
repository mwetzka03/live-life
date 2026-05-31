import type { AppleRemindersAccount } from '../models/AppData';
import { appleRemindersListSourceId, getEnabledAppleRemindersLists } from '../../lib/appleRemindersAccount';
import { AppleRemindersApi, invokeErrorText } from './AppleRemindersApi';
import type { SyncedExternalEvent } from './CalDavApi';
import { CalendarSyncService } from './CalendarService';
import type { CalendarService } from './CalendarService';
import { DateUtils, IdGenerator } from './DateUtils';
import type { SyncResult } from './CalDavSyncService';

const REMINDER_COLOR = '#8b5cf6';

function normalizeListGuid(guid: string): string {
  const trimmed = guid.trim();
  if (trimmed.startsWith('List/')) return trimmed;
  return `List/${trimmed}`;
}

function listGuidMatches(stored: string, responseKey: string): boolean {
  if (stored === responseKey) return true;
  const a = normalizeListGuid(stored);
  const b = normalizeListGuid(responseKey);
  if (a === b) return true;
  const bareStored = stored.replace(/^List\//, '');
  const bareResponse = responseKey.replace(/^List\//, '');
  return bareStored === bareResponse || a.endsWith(bareResponse) || b.endsWith(bareStored);
}

function findListReminders(
  listGuid: string,
  byList: Map<string, SyncedExternalEvent[]>,
): SyncedExternalEvent[] | undefined {
  if (byList.has(listGuid)) {
    return byList.get(listGuid);
  }
  for (const [key, value] of byList.entries()) {
    if (listGuidMatches(listGuid, key)) {
      return value;
    }
  }
  return undefined;
}

function findListError(listGuid: string, errors: Map<string, string>): string | undefined {
  if (errors.has(listGuid)) return errors.get(listGuid);
  for (const [key, value] of errors.entries()) {
    if (listGuidMatches(listGuid, key)) return value;
  }
  return undefined;
}

async function fetchListWithFallback(
  account: AppleRemindersAccount,
  listGuid: string,
  start: string,
  end: string,
  byList: Map<string, SyncedExternalEvent[]>,
  errors: Map<string, string>,
): Promise<{ events: SyncedExternalEvent[]; completionByHref: Record<string, boolean> }> {
  const batch = findListReminders(listGuid, byList);
  if (batch !== undefined) {
    if (batch.length > 0) {
      return { events: batch, completionByHref: {} };
    }
    const fallback = await AppleRemindersApi.fetchListReminders(account, listGuid, start, end);
    return fallback;
  }

  const batchError = findListError(listGuid, errors);
  if (batchError) {
    throw new Error(batchError);
  }

  return AppleRemindersApi.fetchListReminders(account, listGuid, start, end);
}

export class AppleRemindersSyncService {
  private calendar: CalendarService;

  constructor(calendar: CalendarService) {
    this.calendar = calendar;
  }

  async syncAccount(account: AppleRemindersAccount): Promise<SyncResult> {
    const { start, end } = AppleRemindersApi.defaultSyncRange();
    let imported = 0;
    let updated = 0;
    let removed = 0;
    const failedCalendars: string[] = [];
    const reminderCompletionByHref: Record<string, boolean> = {};

    const enabled = getEnabledAppleRemindersLists(account);
    const enabledSources = new Set(
      enabled.map((list) => appleRemindersListSourceId(account.id, list.guid)),
    );

    let byList = new Map<string, SyncedExternalEvent[]>();
    let errors = new Map<string, string>();
    let batchCompletionByHref: Record<string, boolean> = {};

    if (enabled.length > 0) {
      try {
        ({ byList, errors, completionByHref: batchCompletionByHref } =
          await AppleRemindersApi.fetchAllListReminders(
          account,
          enabled.map((l) => l.guid),
          start,
          end,
        ));
        Object.assign(reminderCompletionByHref, batchCompletionByHref);
      } catch {
        // Batch fehlgeschlagen – Einzelabruf pro Liste unten
      }
    }

    for (const list of enabled) {
      const sourceId = appleRemindersListSourceId(account.id, list.guid);

      try {
        const { events: external, completionByHref: listCompletion } = await fetchListWithFallback(
          account,
          list.guid,
          start,
          end,
          byList,
          errors,
        );

        Object.assign(reminderCompletionByHref, listCompletion);

        const externalIds = new Set<string>();

        for (const event of external) {
          externalIds.add(event.uid);
          const upsert = CalendarSyncService.toUpsert(sourceId, event, REMINDER_COLOR);
          const result = this.calendar.upsertExternal(upsert);
          if (result.created) imported++;
          else updated++;
        }

        removed += this.calendar.removeMissingForSource(sourceId, externalIds);
      } catch (error) {
        const message = invokeErrorText(error) || 'Unbekannter Fehler';
        failedCalendars.push(`${list.name}: ${message}`);
      }
    }

    for (const list of account.lists.filter((l) => !l.enabled)) {
      removed += this.calendar.removeAllForSource(appleRemindersListSourceId(account.id, list.guid));
    }

    removed += this.calendar.removeSourcesForAccount(account.id, enabledSources);

    const syncedAny = imported > 0 || updated > 0 || removed > 0;
    const allFailed = failedCalendars.length > 0 && failedCalendars.length === enabled.length && !syncedAny;

    if (allFailed) {
      throw new Error(
        `Sync für alle Listen fehlgeschlagen:\n${failedCalendars.map((f) => `• ${f}`).join('\n')}`,
      );
    }

    return { imported, updated, removed, failedCalendars, reminderCompletionByHref };
  }
}

export class AppleRemindersAccountService {
  private accounts: AppleRemindersAccount[];

  constructor(accounts: AppleRemindersAccount[]) {
    this.accounts = accounts;
  }

  getAll(): AppleRemindersAccount[] {
    return [...this.accounts];
  }

  getById(id: string): AppleRemindersAccount | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  create(input: Omit<AppleRemindersAccount, 'id' | 'createdAt' | 'updatedAt'>): AppleRemindersAccount {
    const now = DateUtils.nowIso();
    const account: AppleRemindersAccount = {
      ...input,
      id: IdGenerator.create(),
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.push(account);
    return account;
  }

  update(
    id: string,
    input: Partial<Omit<AppleRemindersAccount, 'id' | 'createdAt' | 'updatedAt'>>,
  ): AppleRemindersAccount | null {
    const index = this.accounts.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const updated: AppleRemindersAccount = {
      ...this.accounts[index],
      ...input,
      id,
      updatedAt: DateUtils.nowIso(),
    };
    this.accounts[index] = updated;
    return updated;
  }

  delete(id: string): boolean {
    const before = this.accounts.length;
    this.accounts = this.accounts.filter((a) => a.id !== id);
    return this.accounts.length < before;
  }
}
