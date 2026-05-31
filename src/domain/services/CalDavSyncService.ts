import type { CalDavAccount } from '../models/AppData';
import { CalDavApi } from './CalDavApi';
import { calendarSyncSourceId, getCalendarKind, getEnabledCalendars } from '../../lib/caldavAccount';
import { CalendarSyncService } from './CalendarService';
import type { CalendarService } from './CalendarService';
import { DateUtils, IdGenerator } from './DateUtils';

export interface SyncResult {
  imported: number;
  updated: number;
  removed: number;
  failedCalendars: string[];
  reminderCompletionByHref?: Record<string, boolean>;
}

const SYNC_COLORS = ['#3b82f6', '#6366f1', '#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#ef4444'];

export class CalDavSyncService {
  private calendar: CalendarService;

  constructor(calendar: CalendarService) {
    this.calendar = calendar;
  }

  async syncAccount(account: CalDavAccount): Promise<SyncResult> {
    const { start, end } = CalDavApi.defaultSyncRange();
    let imported = 0;
    let updated = 0;
    let removed = 0;
    const failedCalendars: string[] = [];

    const enabled = getEnabledCalendars(account);
    const enabledSources = new Set(
      enabled.map((cal) => calendarSyncSourceId(account.id, cal.href)),
    );

    for (const cal of enabled) {
      const sourceId = calendarSyncSourceId(account.id, cal.href);
      try {
        const kind = getCalendarKind(cal);
        const external =
          kind === 'reminders'
            ? await CalDavApi.fetchReminders(account, cal.href, start, end)
            : await CalDavApi.fetchEvents(account, cal.href, start, end);
        const color = cal.color ?? colorForCalendar(account.id, cal.href);
        const externalIds = new Set<string>();

        for (const event of external) {
          externalIds.add(event.uid);
          const upsert = CalendarSyncService.toUpsert(sourceId, event, color);
          const result = this.calendar.upsertExternal(upsert);
          if (result.created) imported++;
          else updated++;
        }

        removed += this.calendar.removeMissingForSource(sourceId, externalIds);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        failedCalendars.push(`${cal.name}: ${message}`);
      }
    }

    for (const cal of account.calendars.filter((c) => !c.enabled)) {
      removed += this.calendar.removeAllForSource(calendarSyncSourceId(account.id, cal.href));
    }

    removed += this.calendar.removeSourcesForAccount(account.id, enabledSources);

    const syncedAny = imported > 0 || updated > 0 || removed > 0;
    const allFailed = failedCalendars.length > 0 && failedCalendars.length === enabled.length && !syncedAny;

    if (allFailed) {
      throw new Error(
        `Sync für alle Kalender fehlgeschlagen:\n${failedCalendars.map((f) => `• ${f}`).join('\n')}`,
      );
    }

    return { imported, updated, removed, failedCalendars };
  }
}

export class CalDavAccountService {
  private accounts: CalDavAccount[];

  constructor(accounts: CalDavAccount[]) {
    this.accounts = accounts;
  }

  getAll(): CalDavAccount[] {
    return [...this.accounts];
  }

  getById(id: string): CalDavAccount | undefined {
    return this.accounts.find((a) => a.id === id);
  }

  create(input: Omit<CalDavAccount, 'id' | 'createdAt' | 'updatedAt'>): CalDavAccount {
    const now = DateUtils.nowIso();
    const account: CalDavAccount = {
      ...input,
      id: IdGenerator.create(),
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.push(account);
    return account;
  }

  update(id: string, input: Partial<Omit<CalDavAccount, 'id' | 'createdAt' | 'updatedAt'>>): CalDavAccount | null {
    const index = this.accounts.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const updated: CalDavAccount = {
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

function colorForCalendar(accountId: string, href: string): string {
  const key = `${accountId}:${href}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i)) % SYNC_COLORS.length;
  }
  return SYNC_COLORS[hash];
}
