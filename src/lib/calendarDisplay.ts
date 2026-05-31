import type { CalendarEvent, Challenge } from '../domain/models/AppData';
import { DateUtils } from '../domain/services/DateUtils';

export interface TimedCalendarItem {
  id: string;
  kind: 'event' | 'challenge';
  title: string;
  icon: string;
  color: string;
  startTime?: string;
  endTime?: string;
  sortKey: string;
}

export function eventToTimedItem(event: CalendarEvent): TimedCalendarItem {
  return {
    id: event.id,
    kind: 'event',
    title: event.title,
    icon: event.icon,
    color: event.color,
    startTime: event.startTime,
    endTime: event.endTime,
    sortKey: DateUtils.timeSortKey(event.startTime),
  };
}

export function challengeToTimedItem(challenge: Challenge): TimedCalendarItem {
  return {
    id: challenge.id,
    kind: 'challenge',
    title: challenge.title,
    icon: challenge.icon,
    color: challenge.color,
    startTime: challenge.startTime,
    endTime: challenge.endTime,
    sortKey: DateUtils.timeSortKey(challenge.startTime),
  };
}

export function sortTimedItems(items: TimedCalendarItem[]): TimedCalendarItem[] {
  return [...items].sort((a, b) => {
    const timeCmp = a.sortKey.localeCompare(b.sortKey);
    if (timeCmp !== 0) return timeCmp;
    return a.title.localeCompare(b.title);
  });
}

export function splitTimedItems(items: TimedCalendarItem[]) {
  const sorted = sortTimedItems(items);
  const timed = sorted.filter((item) => item.startTime);
  const untimed = sorted.filter((item) => !item.startTime);
  return { timed, untimed };
}
