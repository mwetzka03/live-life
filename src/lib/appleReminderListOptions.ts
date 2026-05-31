import type { AppleRemindersAccount, AppleRemindersLinkedList } from '../domain/models/AppData';
import type { AppleRemindersListInfo } from '../domain/services/AppleRemindersApi';
import { appleRemindersListSourceId } from './appleRemindersAccount';

export interface AppleReminderListOption {
  key: string;
  accountId: string;
  listGuid: string;
  label: string;
}

function normalizeListGuid(guid: string): string {
  const trimmed = guid.trim();
  return trimmed.startsWith('List/') ? trimmed.slice('List/'.length) : trimmed;
}

function optionFromList(account: AppleRemindersAccount, listGuid: string, listName: string): AppleReminderListOption {
  return {
    key: appleRemindersListSourceId(account.id, listGuid),
    accountId: account.id,
    listGuid,
    label: `${account.name} · ${listName}`,
  };
}

/** Gespeicherte Listen am Konto (aus Einstellungen / letztem Sync). */
export function getStoredAppleReminderListOptions(
  accounts: AppleRemindersAccount[],
): AppleReminderListOption[] {
  const options: AppleReminderListOption[] = [];
  for (const account of accounts) {
    if (!account.enabled) continue;
    for (const list of account.lists) {
      options.push(optionFromList(account, list.guid, list.name));
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

/** Führt entdeckte Listen mit bestehenden Konto-Listen zusammen (enabled-Flags bleiben erhalten). */
export function mergeAppleReminderLists(
  existing: AppleRemindersLinkedList[],
  discovered: AppleRemindersListInfo[],
): AppleRemindersLinkedList[] {
  const prevByGuid = new Map(existing.map((list) => [normalizeListGuid(list.guid), list]));

  return discovered.map((list) => {
    const prev = prevByGuid.get(normalizeListGuid(list.guid));
    return {
      guid: list.guid,
      name: list.name,
      enabled: prev?.enabled ?? false,
    };
  });
}
