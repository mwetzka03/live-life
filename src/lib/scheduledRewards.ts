import type { AppStateService } from '../domain/services/AppStateService';
import type { CalendarEvent, ShopItem } from '../domain/models/AppData';
import { DateUtils } from '../domain/services/DateUtils';

export interface ScheduledRewardInfo {
  event: CalendarEvent;
  item: ShopItem;
  claimed: boolean;
  canAfford: boolean;
  shortfall: number;
}

export function getViewRange(viewMode: 'day' | 'week' | 'month', selectedDate: string): {
  start: string;
  end: string;
} {
  if (viewMode === 'day') return { start: selectedDate, end: selectedDate };
  if (viewMode === 'week') {
    return {
      start: DateUtils.startOfWeek(selectedDate),
      end: DateUtils.endOfWeek(selectedDate),
    };
  }
  return {
    start: DateUtils.startOfMonth(selectedDate),
    end: DateUtils.endOfMonth(selectedDate),
  };
}

export function getScheduledRewardsInRange(
  app: AppStateService,
  start: string,
  end: string,
  balance: number,
): ScheduledRewardInfo[] {
  return app.calendar
    .getForRange(start, end)
    .filter((event) => event.linkedShopItemId)
    .map((event) => {
      const item = app.shop.getById(event.linkedShopItemId!);
      if (!item) return null;
      const claimed = app.eventRewards.isClaimed(event.id);
      const canAfford = balance >= item.price;
      const shortfall = claimed ? 0 : Math.max(0, item.price - balance);
      return { event, item, claimed, canAfford, shortfall };
    })
    .filter((entry): entry is ScheduledRewardInfo => entry !== null)
    .sort((a, b) => {
      const dateCmp = (a.event.date ?? '').localeCompare(b.event.date ?? '');
      if (dateCmp !== 0) return dateCmp;
      return (a.event.startTime ?? '').localeCompare(b.event.startTime ?? '');
    });
}
