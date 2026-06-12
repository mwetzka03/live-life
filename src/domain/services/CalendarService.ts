import type { CalendarEvent, RecurrenceType, SyncKind } from '../models/AppData';
import type { SyncedExternalEvent } from './CalDavApi';
import { IdGenerator, DateUtils } from './DateUtils';

export interface ExternalEventUpsert {
  syncSourceId: string;
  externalId: string;
  externalHref: string;
  caldavResourceHref?: string;
  title: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
  weeklyDays?: number[];
  syncKind?: SyncKind;
  seriesKey?: string;
}

function mapSyncedRecurrence(
  freq?: SyncedExternalEvent['recurrence'],
): RecurrenceType | undefined {
  if (freq === 'daily' || freq === 'weekly' || freq === 'monthly') return freq;
  if (freq === 'yearly') return 'monthly';
  return undefined;
}

export function seriesKeyFromExternal(syncSourceId: string, externalId: string, isRecurring: boolean): string | undefined {
  if (!isRecurring) return undefined;
  const base = externalId.split('@')[0] ?? externalId;
  return `${syncSourceId}::${base}`;
}

export class CalendarSyncService {
  static toUpsert(sourceId: string, event: SyncedExternalEvent, color: string): ExternalEventUpsert {
    const isRecurring = event.isRecurring ?? false;
    const syncKind = event.isReminder ? 'reminder' : 'event';
    return {
      syncSourceId: sourceId,
      externalId: event.uid,
      externalHref: event.href,
      caldavResourceHref: event.resourceHref,
      title: event.title,
      description: event.description,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      color: syncKind === 'reminder' ? '#a855f7' : color,
      isRecurring,
      recurrence: mapSyncedRecurrence(event.recurrence),
      weeklyDays: event.weeklyDays,
      seriesKey: seriesKeyFromExternal(sourceId, event.uid, isRecurring),
      syncKind,
    };
  }
}

export class CalendarService {
  private events: CalendarEvent[];

  constructor(events: CalendarEvent[]) {
    this.events = events;
  }

  getAll(): CalendarEvent[] {
    return [...this.events].sort((a, b) => {
      const dateA = a.date ?? '9999-99-99';
      const dateB = b.date ?? '9999-99-99';
      const dateCmp = dateA.localeCompare(dateB);
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime ?? '').localeCompare(b.startTime ?? '');
    });
  }

  getForDate(date: string): CalendarEvent[] {
    return this.getAll().filter((e) => e.date === date);
  }

  getForRange(start: string, end: string): CalendarEvent[] {
    return this.getAll().filter((e) => e.date && e.date >= start && e.date <= end);
  }

  getById(id: string): CalendarEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  findExternal(syncSourceId: string, externalId: string): CalendarEvent | undefined {
    return this.events.find(
      (e) => e.syncSourceId === syncSourceId && e.externalId === externalId,
    );
  }

  findExternalByHref(syncSourceId: string, externalHref: string): CalendarEvent | undefined {
    const normalized = normalizeExternalHref(externalHref);
    return this.events.find(
      (e) =>
        e.syncSourceId === syncSourceId &&
        e.externalHref &&
        normalizeExternalHref(e.externalHref) === normalized,
    );
  }

  create(input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): CalendarEvent {
    const now = DateUtils.nowIso();
    const event: CalendarEvent = {
      ...input,
      id: IdGenerator.create(),
      createdAt: now,
      updatedAt: now,
    };
    this.events.push(event);
    return event;
  }

  update(id: string, input: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>>): CalendarEvent | null {
    const index = this.events.findIndex((e) => e.id === id);
    if (index === -1) return null;
    const existing = this.events[index];
    if (existing.readOnly) return null;
    const updated: CalendarEvent = {
      ...existing,
      ...input,
      id,
      updatedAt: DateUtils.nowIso(),
    };
    this.events[index] = updated;
    return updated;
  }

  delete(id: string, options?: { allowSynced?: boolean }): boolean {
    const event = this.getById(id);
    if (event?.readOnly && !options?.allowSynced) return false;
    const before = this.events.length;
    this.events = this.events.filter((e) => e.id !== id);
    return this.events.length < before;
  }

  assignLinkedChallenge(eventId: string, challengeId: string | undefined): CalendarEvent | null {
    const existing = this.getById(eventId);
    if (!existing?.readOnly) return null;
    const now = DateUtils.nowIso();
    const targets = existing.seriesKey
      ? this.events.filter((e) => e.seriesKey === existing.seriesKey && e.readOnly)
      : [existing];
    let primary: CalendarEvent | null = null;
    for (const event of targets) {
      const index = this.events.findIndex((e) => e.id === event.id);
      if (index === -1) continue;
      const updated: CalendarEvent = {
        ...this.events[index],
        linkedChallengeId: challengeId,
        linkedShopItemId: challengeId ? undefined : this.events[index].linkedShopItemId,
        syncKind: challengeId ? undefined : this.events[index].syncKind,
        updatedAt: now,
      };
      this.events[index] = updated;
      if (event.id === eventId) primary = updated;
    }
    return primary;
  }

  assignLinkedShopItem(eventId: string, shopItemId: string | undefined): CalendarEvent | null {
    const existing = this.getById(eventId);
    if (!existing) return null;
    const now = DateUtils.nowIso();
    const targets =
      existing.seriesKey && existing.readOnly
        ? this.events.filter((e) => e.seriesKey === existing.seriesKey && e.readOnly)
        : [existing];
    let primary: CalendarEvent | null = null;
    for (const event of targets) {
      const index = this.events.findIndex((e) => e.id === event.id);
      if (index === -1) continue;
      const updated: CalendarEvent = {
        ...this.events[index],
        linkedShopItemId: shopItemId,
        linkedChallengeId: shopItemId ? undefined : this.events[index].linkedChallengeId,
        updatedAt: now,
      };
      this.events[index] = updated;
      if (event.id === eventId) primary = updated;
    }
    return primary;
  }

  upsertExternal(input: ExternalEventUpsert): { event: CalendarEvent; created: boolean } {
    let existing = this.findExternal(input.syncSourceId, input.externalId);
    if (!existing && input.externalHref) {
      existing = this.findExternalByHref(input.syncSourceId, input.externalHref);
    }
    const now = DateUtils.nowIso();

    if (existing) {
      const updated: CalendarEvent = {
        ...existing,
        title: input.title,
        description: input.description,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        externalId: input.externalId,
        externalHref: input.externalHref,
        caldavResourceHref: input.caldavResourceHref ?? existing.caldavResourceHref,
        color: input.color ?? existing.color,
        linkedChallengeId: existing.linkedChallengeId,
        linkedShopItemId: existing.linkedShopItemId,
        reminderDismissed: existing.reminderDismissed,
        isRecurring: input.isRecurring ?? existing.isRecurring,
        recurrence: input.recurrence ?? existing.recurrence,
        weeklyDays: input.weeklyDays ?? existing.weeklyDays,
        seriesKey: input.seriesKey ?? existing.seriesKey,
        syncKind: existing.linkedChallengeId
          ? undefined
          : input.syncKind === 'reminder'
            ? 'reminder'
            : (input.syncKind ?? existing.syncKind),
        updatedAt: now,
      };
      const index = this.events.findIndex((e) => e.id === existing.id);
      this.events[index] = updated;
      return { event: updated, created: false };
    }

    const syncKind = input.syncKind ?? 'event';
    const event: CalendarEvent = {
      id: IdGenerator.create(),
      title: input.title,
      description: input.description,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      color: input.color ?? (syncKind === 'reminder' ? '#a855f7' : '#3b82f6'),
      icon: syncKind === 'reminder' ? 'bell' : 'calendar',
      externalId: input.externalId,
      externalHref: input.externalHref,
      caldavResourceHref: input.caldavResourceHref,
      syncSourceId: input.syncSourceId,
      readOnly: true,
      syncKind,
      isRecurring: input.isRecurring,
      recurrence: input.recurrence,
      weeklyDays: input.weeklyDays,
      seriesKey: input.seriesKey,
      createdAt: now,
      updatedAt: now,
    };
    this.events.push(event);
    return { event, created: true };
  }

  dismissReminderSuggestion(eventId: string): CalendarEvent | null {
    const existing = this.getById(eventId);
    if (!existing || existing.syncKind !== 'reminder' || existing.linkedChallengeId) return null;
    const index = this.events.findIndex((e) => e.id === eventId);
    if (index === -1) return null;
    const updated: CalendarEvent = {
      ...this.events[index],
      reminderDismissed: true,
      updatedAt: DateUtils.nowIso(),
    };
    this.events[index] = updated;
    return updated;
  }

  getReminderSuggestions(excludedExternalHrefs?: Set<string>): CalendarEvent[] {
    const today = DateUtils.today();
    return this.getAll().filter(
      (e) =>
        e.syncKind === 'reminder' &&
        e.readOnly &&
        !e.linkedChallengeId &&
        !e.linkedShopItemId &&
        !e.reminderDismissed &&
        !isExcludedReminderHref(e.externalHref, excludedExternalHrefs) &&
        this.isReminderDueForSuggestion(e, today),
    );
  }

  private isReminderDueForSuggestion(event: CalendarEvent, today: string): boolean {
    if (event.isRecurring && event.recurrence && event.recurrence !== 'none' && event.date) {
      return event.date === today;
    }
    return true;
  }

  removeMissingForSource(syncSourceId: string, externalIds: Set<string>): number {
    const before = this.events.length;
    this.events = this.events.filter(
      (e) => !(e.syncSourceId === syncSourceId && e.externalId && !externalIds.has(e.externalId)),
    );
    return before - this.events.length;
  }

  removeAllForSource(syncSourceId: string): number {
    const before = this.events.length;
    this.events = this.events.filter((e) => e.syncSourceId !== syncSourceId);
    return before - this.events.length;
  }

  removeSourcesForAccount(accountId: string, activeSources: Set<string>): number {
    const before = this.events.length;
    this.events = this.events.filter((e) => {
      if (!e.syncSourceId?.startsWith(`${accountId}::`)) return true;
      return activeSources.has(e.syncSourceId);
    });
    return before - this.events.length;
  }

  removeAllForAccount(accountId: string): number {
    const before = this.events.length;
    this.events = this.events.filter((e) => !belongsToAccount(e.syncSourceId, accountId));
    return before - this.events.length;
  }

  cleanupOrphanedSyncEvents(validAccountIds: string[]): number {
    const valid = new Set(validAccountIds);
    const before = this.events.length;
    this.events = this.events.filter((e) => {
      if (!e.syncSourceId) return true;
      const accountId = e.syncSourceId.split('::')[0];
      return valid.has(accountId);
    });
    return before - this.events.length;
  }
}

function belongsToAccount(syncSourceId: string | undefined, accountId: string): boolean {
  if (!syncSourceId) return false;
  return syncSourceId === accountId || syncSourceId.startsWith(`${accountId}::`);
}

function normalizeExternalHref(href: string): string {
  const trimmed = href.trim();
  return trimmed.startsWith('Reminder/') ? trimmed : `Reminder/${trimmed}`;
}

function isExcludedReminderHref(
  href: string | undefined,
  excluded: Set<string> | undefined,
): boolean {
  if (!href || !excluded || excluded.size === 0) return false;
  return excluded.has(normalizeExternalHref(href));
}

export type CalendarEventInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;
