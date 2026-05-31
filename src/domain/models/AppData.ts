export type CalendarViewMode = 'day' | 'week' | 'month';

export type RecurrenceType = 'none' | 'irregular' | 'daily' | 'weekly' | 'monthly';

export type ChallengeCategory = 'health' | 'habit' | 'sport' | 'todo' | 'other';

export type CalDavProvider = 'icloud' | 'google' | 'outlook' | 'custom';

export type SyncKind = 'event' | 'reminder';

export type CalDavCalendarKind = 'events' | 'reminders';

export interface CalDavLinkedCalendar {
  href: string;
  name: string;
  color?: string;
  enabled: boolean;
  calendarKind?: CalDavCalendarKind;
}

export interface CalDavAccount {
  id: string;
  name: string;
  provider: CalDavProvider;
  serverUrl: string;
  username: string;
  password: string;
  calendars: CalDavLinkedCalendar[];
  /** @deprecated Legacy – wird beim Laden migriert */
  calendarHref?: string;
  /** @deprecated Legacy – wird beim Laden migriert */
  calendarName?: string;
  enabled: boolean;
  autoSync: boolean;
  lastSyncAt?: string;
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  color: string;
  icon: string;
  externalId?: string;
  externalHref?: string;
  syncSourceId?: string;
  readOnly?: boolean;
  linkedChallengeId?: string;
  linkedShopItemId?: string;
  syncKind?: SyncKind;
  reminderDismissed?: boolean;
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
  weeklyDays?: number[];
  seriesKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Challenge {
  id: string;
  title: string;
  description?: string;
  icon: string;
  category: ChallengeCategory;
  coinReward: number;
  recurrence: RecurrenceType;
  weeklyDays?: number[];
  startDate: string;
  endDate?: string;
  streakTarget?: number;
  startTime?: string;
  endTime?: string;
  color: string;
  /** Von der App in iCloud angelegte Erinnerung */
  icloudReminderHref?: string;
  icloudReminderSourceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeCompletion {
  id: string;
  challengeId: string;
  date: string;
  coinsEarned: number;
  baseReward?: number;
  multiplier?: number;
  completedAt: string;
}

export interface ShopItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  price: number;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRewardClaim {
  id: string;
  eventId: string;
  shopItemId: string;
  date: string;
  coinsSpent: number;
  claimedAt: string;
}

export interface Purchase {
  id: string;
  shopItemId: string;
  title: string;
  coinsSpent: number;
  purchasedAt: string;
}

export interface CoinTransaction {
  id: string;
  amount: number;
  type: 'earn' | 'spend';
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface AppleRemindersLinkedList {
  guid: string;
  name: string;
  enabled: boolean;
}

/** Native Apple Reminders via iCloud-Web-API (Beta, Windows). */
export interface AppleRemindersAccount {
  id: string;
  name: string;
  appleId: string;
  password: string;
  lists: AppleRemindersLinkedList[];
  enabled: boolean;
  autoSync: boolean;
  lastSyncAt?: string;
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BucketlistItem {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  /** Zieljahr – null = unbekannte Zeit */
  targetYear: number | null;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  version: number;
  events: CalendarEvent[];
  challenges: Challenge[];
  completions: ChallengeCompletion[];
  eventRewardClaims: EventRewardClaim[];
  shopItems: ShopItem[];
  purchases: Purchase[];
  transactions: CoinTransaction[];
  calDavAccounts: CalDavAccount[];
  appleRemindersAccounts: AppleRemindersAccount[];
  bucketlistItems: BucketlistItem[];
}

export const EMPTY_APP_DATA: AppData = {
  version: 2,
  events: [],
  challenges: [],
  completions: [],
  eventRewardClaims: [],
  shopItems: [],
  purchases: [],
  transactions: [],
  calDavAccounts: [],
  appleRemindersAccounts: [],
  bucketlistItems: [],
};
