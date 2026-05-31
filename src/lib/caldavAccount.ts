import type { CalDavCalendarKind, CalDavLinkedCalendar } from '../domain/models/AppData';

export function calendarSyncSourceId(accountId: string, calendarHref: string): string {
  return `${accountId}::${calendarHref}`;
}

export function getEnabledCalendars(account: { calendars: CalDavLinkedCalendar[] }): CalDavLinkedCalendar[] {
  return account.calendars.filter((c: CalDavLinkedCalendar) => c.enabled);
}

export function getCalendarKind(cal: {
  calendarKind?: CalDavCalendarKind;
}): CalDavCalendarKind {
  return cal.calendarKind ?? 'events';
}

export function isReminderCalendar(cal: {
  calendarKind?: CalDavCalendarKind;
}): boolean {
  return getCalendarKind(cal) === 'reminders';
}

/** @deprecated use isReminderCalendar */
export function isEventCalendar(cal: { calendarKind?: CalDavCalendarKind }): boolean {
  return !isReminderCalendar(cal);
}

/** Kalender, die fälschlich als Erinnerungen klassifiziert wurden (Name „To-Do“ ≠ Apple Reminders). */
export function wasMisclassifiedAsReminders(cal: {
  name: string;
  href?: string;
  calendarKind?: CalDavCalendarKind;
}): boolean {
  if (cal.calendarKind !== 'reminders') return false;
  const n = cal.name.toLowerCase().trim();
  const h = (cal.href ?? '').toLowerCase();
  const todoLike =
    n === 'to-do' ||
    n === 'to-dos' ||
    n === 'todo' ||
    n === 'todos' ||
    /^to-?dos?$/.test(n.replace(/\s+/g, ''));
  const explicitReminder =
    n.includes('erinnerung') || n.includes('reminder') || h.includes('/reminder');
  return todoLike && !explicitReminder;
}

export function accountCalendarSummary(account: { calendars: CalDavLinkedCalendar[] }): string {
  const enabled = getEnabledCalendars(account);
  if (enabled.length === 0) return 'Keine Kalender aktiv';
  if (enabled.length === 1) return enabled[0].name;
  const events = enabled.filter((c) => getCalendarKind(c) === 'events').length;
  const reminders = enabled.filter((c) => getCalendarKind(c) === 'reminders').length;
  const parts: string[] = [];
  if (events > 0) parts.push(`${events} Kalender`);
  if (reminders > 0) parts.push(`${reminders} Erinnerungen`);
  return parts.join(', ');
}

export function normalizeCalDavAccount<T extends {
  calendars?: CalDavLinkedCalendar[];
  calendarHref?: string;
  calendarName?: string;
}>(raw: T): T {
  if (raw.calendars?.length) {
    return {
      ...raw,
      calendars: raw.calendars.map((c: CalDavLinkedCalendar) => ({
        ...c,
        enabled: c.enabled ?? true,
        calendarKind: getCalendarKind(c),
      })),
    };
  }
  if (raw.calendarHref) {
    return {
      ...raw,
      calendars: [
        {
          href: raw.calendarHref,
          name: raw.calendarName ?? 'Kalender',
          enabled: true,
          calendarKind: 'events' as CalDavCalendarKind,
        },
      ],
    };
  }
  return { ...raw, calendars: [] };
}
