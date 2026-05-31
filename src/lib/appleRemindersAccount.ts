import type { AppleRemindersLinkedList } from '../domain/models/AppData';

export function appleRemindersListSourceId(accountId: string, listGuid: string): string {
  return `${accountId}::${listGuid}`;
}

export function parseAppleRemindersSourceId(
  syncSourceId: string,
): { accountId: string; listGuid: string } | null {
  const idx = syncSourceId.indexOf('::');
  if (idx <= 0) return null;
  return {
    accountId: syncSourceId.slice(0, idx),
    listGuid: syncSourceId.slice(idx + 2),
  };
}

export function getEnabledAppleRemindersLists(account: {
  lists: AppleRemindersLinkedList[];
}): AppleRemindersLinkedList[] {
  return account.lists.filter((l) => l.enabled);
}

export function appleRemindersAccountSummary(account: { lists: AppleRemindersLinkedList[] }): string {
  const enabled = getEnabledAppleRemindersLists(account);
  if (enabled.length === 0) return 'Keine Listen aktiv';
  if (enabled.length === 1) return enabled[0].name;
  return `${enabled.length} Listen`;
}
