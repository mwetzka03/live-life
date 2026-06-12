import { invoke } from '@tauri-apps/api/core';
import type { CalDavAccount } from '../models/AppData';
import { DateUtils } from './DateUtils';

export interface CalDavCalendarInfo {
  href: string;
  name: string;
  color?: string;
  calendarKind?: 'events' | 'reminders';
  supportsVevent?: boolean;
  supportsVtodo?: boolean;
}

export interface SyncedExternalEvent {
  uid: string;
  href: string;
  resourceHref?: string;
  title: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  isRecurring?: boolean;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  weeklyDays?: number[];
  isReminder?: boolean;
  completed?: boolean;
}

export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function toConfig(account: CalDavAccount, calendarHref: string) {
  return {
    serverUrl: account.serverUrl,
    username: account.username,
    password: account.password,
    calendarHref,
  };
}

export class CalDavApi {
  static async discoverCalendars(
    serverUrl: string,
    username: string,
    password: string,
  ): Promise<CalDavCalendarInfo[]> {
    if (!isTauriApp()) {
      throw new Error('Kalender-Sync ist nur in der Desktop-App verfügbar.');
    }
    return invoke<CalDavCalendarInfo[]>('caldav_discover_calendars', {
      config: { serverUrl, username, password, calendarHref: '' },
    });
  }

  static async testConnection(account: CalDavAccount): Promise<string> {
    if (!isTauriApp()) {
      throw new Error('Kalender-Sync ist nur in der Desktop-App verfügbar.');
    }
    return invoke<string>('caldav_test_connection', {
      config: toConfig(account, ''),
    });
  }

  static async fetchReminders(
    account: CalDavAccount,
    calendarHref: string,
    start: string,
    end: string,
  ): Promise<SyncedExternalEvent[]> {
    if (!isTauriApp()) {
      throw new Error('Kalender-Sync ist nur in der Desktop-App verfügbar.');
    }
    return CalDavApi.mapSyncedEvents(
      await invoke('caldav_fetch_reminders', {
        config: toConfig(account, calendarHref),
        start,
        end,
      }),
    );
  }

  private static mapSyncedEvents(
    raw: Array<{
      uid: string;
      href: string;
      resourceHref?: string;
      title: string;
      description?: string;
      date: string;
      startTime?: string;
      endTime?: string;
      isRecurring?: boolean;
      recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';
      weeklyDays?: number[];
      isReminder?: boolean;
    }>,
  ): SyncedExternalEvent[] {
    return raw.map((event) => ({
      uid: event.uid,
      href: event.href,
      resourceHref: event.resourceHref,
      title: event.title,
      description: event.description,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      isRecurring: event.isRecurring,
      recurrence: event.recurrence,
      weeklyDays: event.weeklyDays,
      isReminder: event.isReminder,
    }));
  }

  static async fetchEvents(
    account: CalDavAccount,
    calendarHref: string,
    start: string,
    end: string,
  ): Promise<SyncedExternalEvent[]> {
    if (!isTauriApp()) {
      throw new Error('Kalender-Sync ist nur in der Desktop-App verfügbar.');
    }
    return CalDavApi.mapSyncedEvents(
      await invoke<Array<{
        uid: string;
        href: string;
        resourceHref?: string;
        title: string;
        description?: string;
        date: string;
        startTime?: string;
        endTime?: string;
        isRecurring?: boolean;
        recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';
        weeklyDays?: number[];
        isReminder?: boolean;
      }>>('caldav_fetch_events', {
        config: toConfig(account, calendarHref),
        start,
        end,
      }),
    );
  }

  static defaultSyncRange(): { start: string; end: string } {
    const today = DateUtils.today();
    return {
      start: DateUtils.addDays(today, -30),
      end: DateUtils.addDays(today, 365),
    };
  }

  static async deleteEvent(
    account: CalDavAccount,
    calendarHref: string,
    request: {
      resourceHref: string;
      occurrenceDate?: string;
      startTime?: string;
      isRecurring?: boolean;
    },
  ): Promise<void> {
    if (!isTauriApp()) {
      throw new Error('Kalender-Sync ist nur in der Desktop-App verfügbar.');
    }
    await invoke('caldav_delete_event', {
      config: toConfig(account, calendarHref),
      request: {
        resourceHref: request.resourceHref,
        occurrenceDate: request.occurrenceDate,
        startTime: request.startTime,
        isRecurring: request.isRecurring ?? false,
      },
    });
  }
}
