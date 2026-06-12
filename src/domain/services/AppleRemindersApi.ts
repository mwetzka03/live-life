import { invoke } from '@tauri-apps/api/core';
import type { AppleRemindersAccount } from '../models/AppData';
import { DateUtils } from './DateUtils';
import type { SyncedExternalEvent } from './CalDavApi';
import { isTauriApp } from './CalDavApi';

export interface AppleRemindersListInfo {
  guid: string;
  name: string;
}

export interface AppleRemindersListFetchResult {
  events: SyncedExternalEvent[];
  completionByHref: Record<string, boolean>;
}

function mergeCompletionMaps(
  target: Record<string, boolean>,
  source: Record<string, boolean> | undefined,
): void {
  if (!source) return;
  for (const [href, completed] of Object.entries(source)) {
    target[href] = completed;
  }
}

function toConfig(
  account: Pick<AppleRemindersAccount, 'appleId' | 'password' | 'id'>,
  extras?: {
    twoFactorCode?: string;
    listGuid?: string;
    reminderHref?: string;
    completed?: boolean;
    title?: string;
    description?: string;
    dueDate?: string;
    dueTime?: string;
    subtasks?: string;
  },
) {
  return {
    appleId: account.appleId,
    password: account.password,
    accountId: account.id,
    twoFactorCode: extras?.twoFactorCode,
    listGuid: extras?.listGuid,
    reminderHref: extras?.reminderHref,
    completed: extras?.completed === undefined ? undefined : extras.completed ? 'true' : 'false',
    title: extras?.title,
    description: extras?.description,
    dueDate: extras?.dueDate,
    dueTime: extras?.dueTime,
    subtasks: extras?.subtasks,
  };
}

export function invokeErrorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function mapSyncedEvents(
  raw: Array<{
    uid: string;
    href: string;
    title: string;
    description?: string;
    date?: string;
    startTime?: string;
    isReminder?: boolean;
    isRecurring?: boolean;
    recurrence?: 'daily' | 'weekly' | 'monthly';
    completed?: boolean;
  }>,
): SyncedExternalEvent[] {
  return raw.map((event) => ({
    uid: event.uid,
    href: event.href,
    title: event.title,
    description: event.description,
    date: event.date,
    startTime: event.startTime,
    isReminder: true,
    isRecurring: event.isRecurring,
    recurrence: event.recurrence,
    completed: event.completed,
  }));
}

export class AppleRemindersApi {
  static ensureDesktop() {
    if (!isTauriApp()) {
      throw new Error('Apple Reminders (Beta) ist nur in der Desktop-App verfügbar.');
    }
  }

  /** Installiert Python + pyicloud still im Hintergrund (Windows). */
  static async ensureRuntime(): Promise<string> {
    if (!isTauriApp()) return 'skipped';
    return invoke<string>('apple_reminders_ensure_runtime');
  }

  static async testConnection(
    account: Pick<AppleRemindersAccount, 'appleId' | 'password' | 'id'>,
  ): Promise<string> {
    AppleRemindersApi.ensureDesktop();
    return invoke<string>('apple_reminders_test_connection', {
      config: toConfig(account),
    });
  }

  /** Bestätigt den zuvor angeforderten 2FA-Code ohne neuen Login. */
  static async confirmTwoFactor(
    account: Pick<AppleRemindersAccount, 'appleId' | 'password' | 'id'>,
    twoFactorCode: string,
  ): Promise<string> {
    AppleRemindersApi.ensureDesktop();
    return invoke<string>('apple_reminders_test_connection', {
      config: toConfig(account, { twoFactorCode }),
    });
  }

  static async discoverLists(
    account: Pick<AppleRemindersAccount, 'appleId' | 'password' | 'id'>,
    twoFactorCode?: string,
  ): Promise<AppleRemindersListInfo[]> {
    AppleRemindersApi.ensureDesktop();
    return invoke<AppleRemindersListInfo[]>('apple_reminders_discover_lists', {
      config: toConfig(account, { twoFactorCode }),
    });
  }

  static async fetchAllListReminders(
    account: AppleRemindersAccount,
    listGuids: string[],
    start: string,
    end: string,
  ): Promise<{
    byList: Map<string, SyncedExternalEvent[]>;
    errors: Map<string, string>;
    completionByHref: Record<string, boolean>;
  }> {
    AppleRemindersApi.ensureDesktop();
    const byList = new Map<string, SyncedExternalEvent[]>();
    const errors = new Map<string, string>();
    const completionByHref: Record<string, boolean> = {};
    if (listGuids.length === 0) return { byList, errors, completionByHref };

    const results = await invoke<
      Array<{
        listGuid: string;
        reminders?: Array<{
          uid: string;
          href: string;
          title: string;
          description?: string;
          date?: string;
          startTime?: string;
          isRecurring?: boolean;
          recurrence?: 'daily' | 'weekly' | 'monthly';
        }>;
        completionByHref?: Record<string, boolean>;
        error?: string;
      }>
    >('apple_reminders_fetch_all', {
      config: toConfig(account),
      start,
      end,
      listGuids,
    });

    for (const item of results) {
      if (item.error) {
        errors.set(item.listGuid, item.error);
      } else {
        byList.set(item.listGuid, mapSyncedEvents(item.reminders ?? []));
        mergeCompletionMaps(completionByHref, item.completionByHref);
      }
    }
    return { byList, errors, completionByHref };
  }

  static async fetchListReminders(
    account: AppleRemindersAccount,
    listGuid: string,
    start: string,
    end: string,
    twoFactorCode?: string,
  ): Promise<AppleRemindersListFetchResult> {
    AppleRemindersApi.ensureDesktop();
    const result = await invoke<{
      reminders: Array<{
        uid: string;
        href: string;
        title: string;
        description?: string;
        date?: string;
        startTime?: string;
        isRecurring?: boolean;
        recurrence?: 'daily' | 'weekly' | 'monthly';
      }>;
      completionByHref?: Record<string, boolean>;
    }>('apple_reminders_fetch', {
      config: toConfig(account, { listGuid, twoFactorCode }),
      start,
      end,
    });
    return {
      events: mapSyncedEvents(result.reminders ?? []),
      completionByHref: result.completionByHref ?? {},
    };
  }

  static async completeReminder(
    account: AppleRemindersAccount,
    listGuid: string,
    reminderHref: string,
  ): Promise<void> {
    await AppleRemindersApi.setReminderCompleted(account, listGuid, reminderHref, true);
  }

  static async setReminderCompleted(
    account: AppleRemindersAccount,
    listGuid: string,
    reminderHref: string,
    completed: boolean,
  ): Promise<void> {
    AppleRemindersApi.ensureDesktop();
    await invoke('apple_reminders_set_status', {
      config: toConfig(account, { listGuid, reminderHref, completed }),
    });
  }

  static async createReminder(
    account: AppleRemindersAccount,
    listGuid: string,
    input: {
      title: string;
      description?: string;
      date?: string;
      startTime?: string;
    },
  ): Promise<{ uid: string; href: string; title: string }> {
    AppleRemindersApi.ensureDesktop();
    return invoke('apple_reminders_create', {
      config: toConfig(account, {
        listGuid,
        title: input.title,
        description: input.description,
        dueDate: input.date,
        dueTime: input.startTime,
      }),
    });
  }

  static async createReminderGroup(
    account: AppleRemindersAccount,
    listGuid: string,
    input: {
      title: string;
      description?: string;
      date?: string;
      startTime?: string;
      subtasks: Array<{ key: string; title: string }>;
    },
  ): Promise<{ uid: string; href: string; title: string; subtaskHrefs: Record<string, string> }> {
    AppleRemindersApi.ensureDesktop();
    return invoke('apple_reminders_create_group', {
      config: toConfig(account, {
        listGuid,
        title: input.title,
        description: input.description,
        dueDate: input.date,
        dueTime: input.startTime,
        subtasks: JSON.stringify(input.subtasks),
      }),
    });
  }

  static async deleteReminder(
    account: AppleRemindersAccount,
    listGuid: string,
    reminderHref: string,
  ): Promise<void> {
    AppleRemindersApi.ensureDesktop();
    await invoke('apple_reminders_delete', {
      config: toConfig(account, { listGuid, reminderHref }),
    });
  }

  static defaultSyncRange(): { start: string; end: string } {
    const today = DateUtils.today();
    return {
      start: DateUtils.addDays(today, -90),
      end: DateUtils.addDays(today, 365),
    };
  }

  static isTwoFactorRequired(error: unknown): boolean {
    const text = invokeErrorText(error);
    return text.startsWith('TWO_FACTOR_REQUIRED:') || text.startsWith('TWO_FACTOR_PENDING:');
  }

  static twoFactorMessage(error: unknown): string {
    const text = invokeErrorText(error);
    if (text.startsWith('TWO_FACTOR_REQUIRED:')) {
      return text.slice('TWO_FACTOR_REQUIRED:'.length);
    }
    if (text.startsWith('TWO_FACTOR_PENDING:')) {
      return text.slice('TWO_FACTOR_PENDING:'.length);
    }
    return 'Zwei-Faktor-Code erforderlich.';
  }
}
