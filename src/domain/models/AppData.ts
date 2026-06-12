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
  /** Gehört zu einer Gruppen-Challenge */
  groupId?: string;
  /** Von der App in iCloud angelegte Erinnerung */
  icloudReminderHref?: string;
  icloudReminderSourceId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Einmalige Challenge-Gruppe mit verknüpften Einzel-Challenges */
export interface ChallengeGroup {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  challengeIds: string[];
  startDate: string;
  startTime?: string;
  icloudReminderHref?: string;
  icloudReminderSourceId?: string;
  /** challengeId → iCloud-Unteraufgabe (falls angelegt) */
  icloudSubtaskHrefs?: Record<string, string>;
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
  /** Verknüpft mit Bucketlist-Eintrag (Visionboard) */
  bucketlistItemId?: string;
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
  /** Verknüpfter Shop-Eintrag */
  shopItemId?: string;
  createdAt: string;
  updatedAt: string;
}

export type VisionBoardElementType = 'text' | 'shape' | 'image';

export interface VisionBoardElement {
  id: string;
  type: VisionBoardElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  color?: string;
  shape?: 'rect' | 'circle' | 'line';
  fill?: string;
  /** 0–100 */
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  /** Zentrierter Text in Formen */
  labelText?: string;
  src?: string;
  /** Unzugeschnittenes Original – für „Zuschnitt zurücksetzen“ */
  originalSrc?: string;
  originalX?: number;
  originalY?: number;
  originalWidth?: number;
  originalHeight?: number;
  originalImageSourceWidth?: number;
  originalImageSourceHeight?: number;
  /** Anzeigegröße des Bildes im Rahmen */
  imageSourceWidth?: number;
  imageSourceHeight?: number;
  /** Rand-Einrückungen 0–1 (links, oben, rechts, unten) */
  imageCrop?: { left: number; top: number; right: number; bottom: number };
}

export interface VisionBoard {
  id: string;
  name: string;
  backgroundColor: string;
  /** 0–100 */
  backgroundOpacity: number;
  zoom: number;
  panX: number;
  panY: number;
  elements: VisionBoardElement[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  version: number;
  events: CalendarEvent[];
  challenges: Challenge[];
  challengeGroups: ChallengeGroup[];
  completions: ChallengeCompletion[];
  eventRewardClaims: EventRewardClaim[];
  shopItems: ShopItem[];
  purchases: Purchase[];
  transactions: CoinTransaction[];
  calDavAccounts: CalDavAccount[];
  appleRemindersAccounts: AppleRemindersAccount[];
  bucketlistItems: BucketlistItem[];
  visionBoards: VisionBoard[];
  activeVisionBoardId?: string;
}

export const EMPTY_APP_DATA: AppData = {
  version: 3,
  events: [],
  challenges: [],
  challengeGroups: [],
  completions: [],
  eventRewardClaims: [],
  shopItems: [],
  purchases: [],
  transactions: [],
  calDavAccounts: [],
  appleRemindersAccounts: [],
  bucketlistItems: [],
  visionBoards: [],
};
