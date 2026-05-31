import type { CalDavLinkedCalendar } from '../domain/models/AppData';
import type { TranslationDict } from './types';
import { getCalendarKind, getEnabledCalendars } from '../lib/caldavAccount';

export function accountCalendarSummary(
  account: { calendars: CalDavLinkedCalendar[] },
  s: TranslationDict['accountSummary']['caldav'],
): string {
  const enabled = getEnabledCalendars(account);
  if (enabled.length === 0) return s.noCalendars;
  if (enabled.length === 1) return enabled[0].name;
  const events = enabled.filter((c) => getCalendarKind(c) === 'events').length;
  const reminders = enabled.filter((c) => getCalendarKind(c) === 'reminders').length;
  const parts: string[] = [];
  if (events > 0) parts.push(s.eventsCount.replace('{{count}}', String(events)));
  if (reminders > 0) parts.push(s.remindersCount.replace('{{count}}', String(reminders)));
  return parts.join(', ');
}

export function appleRemindersAccountSummary(
  account: { lists: { enabled: boolean; name: string }[] },
  s: TranslationDict['accountSummary']['appleReminders'],
): string {
  const enabled = account.lists.filter((l) => l.enabled);
  if (enabled.length === 0) return s.noLists;
  if (enabled.length === 1) return enabled[0].name;
  return s.listsCount.replace('{{count}}', String(enabled.length));
}
