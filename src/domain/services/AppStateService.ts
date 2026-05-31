import { EMPTY_APP_DATA, type AppData, type CalDavAccount, type CalendarEvent, type Challenge } from '../models/AppData';
import { normalizeCalDavAccount, wasMisclassifiedAsReminders, getEnabledCalendars } from '../../lib/caldavAccount';
import { parseAppleRemindersSourceId, getEnabledAppleRemindersLists } from '../../lib/appleRemindersAccount';
import { mergeAppleReminderLists } from '../../lib/appleReminderListOptions';
import { AppleRemindersApi } from './AppleRemindersApi';
import { isTauriApp } from './CalDavApi';
import { devLog } from '../../lib/startupDevLog';
import { LocalStorageRepository } from '../repositories/LocalStorageRepository';
import { CalendarService } from './CalendarService';
import { CalDavAccountService, CalDavSyncService, type SyncResult } from './CalDavSyncService';
import {
  AppleRemindersAccountService,
  AppleRemindersSyncService,
} from './AppleRemindersSyncService';
import { ChallengeService } from './ChallengeService';
import { CoinService } from './CoinService';
import { DateUtils } from './DateUtils';
import { EventRewardService } from './EventRewardService';
import { BucketlistService } from './BucketlistService';
import { ShopService } from './ShopService';

type Listener = () => void;

function normalizeAppData(raw: Partial<AppData> | null): AppData {
  if (!raw) return { ...EMPTY_APP_DATA };
  return {
    version: raw.version ?? 1,
    events: (raw.events ?? []).map((event) => {
      if (event.syncKind || !event.readOnly || !event.syncSourceId) return event;
      if (!parseAppleRemindersSourceId(event.syncSourceId)) return event;
      return { ...event, syncKind: 'reminder' as const, icon: 'bell' };
    }),
    challenges: raw.challenges ?? [],
    completions: raw.completions ?? [],
    eventRewardClaims: raw.eventRewardClaims ?? [],
    shopItems: raw.shopItems ?? [],
    purchases: raw.purchases ?? [],
    transactions: raw.transactions ?? [],
    calDavAccounts: (raw.calDavAccounts ?? []).map((a) => normalizeCalDavAccount(a as CalDavAccount)),
    appleRemindersAccounts: (raw.appleRemindersAccounts ?? []).map((a) => ({
      ...a,
      lists: (a.lists ?? []).map((l) => ({ ...l, enabled: l.enabled ?? true })),
      enabled: a.enabled ?? true,
      autoSync: a.autoSync ?? true,
    })),
    bucketlistItems: raw.bucketlistItems ?? [],
  };
}

export class AppStateService {
  private data: AppData;
  private repository: LocalStorageRepository;
  private listeners: Set<Listener> = new Set();
  private cachedSnapshot: AppData | null = null;
  private suppressICloudPush = false;

  readonly calendar: CalendarService;
  readonly challenges: ChallengeService;
  readonly coins: CoinService;
  readonly shop: ShopService;
  readonly bucketlist: BucketlistService;
  readonly eventRewards: EventRewardService;
  readonly calDavAccounts: CalDavAccountService;
  readonly appleRemindersAccounts: AppleRemindersAccountService;
  private calDavSync: CalDavSyncService;
  private appleRemindersSync: AppleRemindersSyncService;

  constructor(repository = new LocalStorageRepository()) {
    this.repository = repository;
    this.data = normalizeAppData(repository.load());
    this.coins = new CoinService(this.data.transactions);
    this.calendar = new CalendarService(this.data.events);
    this.challenges = new ChallengeService(this.data.challenges, this.data.completions);
    this.shop = new ShopService(this.data.shopItems, this.data.purchases, this.coins);
    this.bucketlist = new BucketlistService(this.data.bucketlistItems);
    this.eventRewards = new EventRewardService(this.data.eventRewardClaims);
    this.calDavAccounts = new CalDavAccountService(this.data.calDavAccounts);
    this.appleRemindersAccounts = new AppleRemindersAccountService(this.data.appleRemindersAccounts);
    this.calDavSync = new CalDavSyncService(this.calendar);
    this.appleRemindersSync = new AppleRemindersSyncService(this.calendar);
    this.cleanupOrphanedSyncEvents();
    this.fixMisclassifiedTodoCalendars();
    if (this.persistChallengeAppleReminderLinks()) {
      this.persist();
    }
  }

  private appleReminderLinkFromEvent(
    event: CalendarEvent,
  ): Pick<Challenge, 'icloudReminderHref' | 'icloudReminderSourceId'> | undefined {
    if (!event.externalHref || !event.syncSourceId) return undefined;
    if (!parseAppleRemindersSourceId(event.syncSourceId)) return undefined;
    return {
      icloudReminderHref: event.externalHref,
      icloudReminderSourceId: event.syncSourceId,
    };
  }

  /** iCloud-Href auf der Challenge sichern, bevor abgehakte Erinnerungen aus dem Sync verschwinden. */
  persistChallengeAppleReminderLinks(): boolean {
    let changed = false;
    for (const event of this.calendar.getAll()) {
      if (!event.linkedChallengeId) continue;
      const link = this.appleReminderLinkFromEvent(event);
      if (!link) continue;
      const challenge = this.challenges.getById(event.linkedChallengeId);
      if (!challenge || challenge.icloudReminderHref) continue;
      this.challenges.update(event.linkedChallengeId, link);
      changed = true;
    }
    return changed;
  }

  private persistAppleReminderLinkOnChallenge(challengeId: string, event?: CalendarEvent | null): void {
    const challenge = this.challenges.getById(challengeId);
    if (!challenge || challenge.icloudReminderHref) return;

    const sourceEvent =
      event ??
      this.calendar
        .getAll()
        .find((e) => e.linkedChallengeId === challengeId && e.externalHref && e.syncSourceId);

    if (!sourceEvent) return;
    const link = this.appleReminderLinkFromEvent(sourceEvent);
    if (!link) return;
    this.challenges.update(challengeId, link);
  }

  private syncLinkedChallengesFromAppleReminders(): boolean {
    let changed = this.persistChallengeAppleReminderLinks();
    for (const event of this.calendar.getAll()) {
      if (!event.linkedChallengeId || !event.syncSourceId) continue;
      if (!parseAppleRemindersSourceId(event.syncSourceId)) continue;

      const challenge = this.challenges.getById(event.linkedChallengeId);
      if (!challenge) continue;

      const patch: Partial<Challenge> = {};
      if (event.date && event.date !== challenge.startDate) patch.startDate = event.date;
      if ((event.startTime ?? undefined) !== (challenge.startTime ?? undefined)) {
        patch.startTime = event.startTime;
      }
      if ((event.endTime ?? undefined) !== (challenge.endTime ?? undefined)) {
        patch.endTime = event.endTime;
      }
      if (!challenge.icloudReminderHref && event.externalHref) {
        patch.icloudReminderHref = event.externalHref;
        patch.icloudReminderSourceId = event.syncSourceId;
      }

      if (Object.keys(patch).length > 0) {
        this.challenges.update(challenge.id, patch);
        changed = true;
      }
    }
    return changed;
  }

  private getLinkedReminderExternalHrefs(): Set<string> {
    const hrefs = new Set<string>();
    for (const challenge of this.challenges.getAll()) {
      if (challenge.icloudReminderHref) {
        hrefs.add(this.normalizeReminderHref(challenge.icloudReminderHref));
      }
    }
    for (const event of this.calendar.getAll()) {
      if (event.externalHref && event.linkedChallengeId) {
        hrefs.add(this.normalizeReminderHref(event.externalHref));
      }
    }
    return hrefs;
  }

  private linkAllReminderEventsToChallenge(sourceEvent: CalendarEvent, challengeId: string): void {
    if (!sourceEvent.externalHref || !sourceEvent.syncSourceId) {
      this.calendar.assignLinkedChallenge(sourceEvent.id, challengeId);
      return;
    }
    const href = this.normalizeReminderHref(sourceEvent.externalHref);
    for (const event of this.calendar.getAll()) {
      if (
        event.syncSourceId === sourceEvent.syncSourceId &&
        event.externalHref &&
        this.normalizeReminderHref(event.externalHref) === href
      ) {
        this.calendar.assignLinkedChallenge(event.id, challengeId);
      }
    }
  }

  private normalizeReminderHref(href: string): string {
    const trimmed = href.trim();
    return trimmed.startsWith('Reminder/') ? trimmed : `Reminder/${trimmed}`;
  }

  private getICloudCompletionStatus(
    completionByHref: Record<string, boolean>,
    href: string,
  ): boolean | undefined {
    if (completionByHref[href] !== undefined) return completionByHref[href];
    const normalized = this.normalizeReminderHref(href);
    if (completionByHref[normalized] !== undefined) return completionByHref[normalized];
    const bare = href.split('/').pop();
    if (!bare) return undefined;
    for (const [key, value] of Object.entries(completionByHref)) {
      if (key.endsWith(bare)) return value;
    }
    return undefined;
  }

  private resolveChallengeSyncDate(challenge: Challenge): string {
    const linked = this.calendar
      .getAll()
      .find((e) => e.linkedChallengeId === challenge.id && e.date);
    return linked?.date ?? challenge.startDate ?? DateUtils.today();
  }

  private isChallengeCompletedInApp(challenge: Challenge): boolean {
    if (challenge.recurrence === 'none') {
      return this.challenges.hasAnyCompletion(challenge.id);
    }
    if (challenge.recurrence === 'irregular') {
      return this.challenges.getCompletionsForChallenge(challenge.id).length > 0;
    }
    return this.challenges.isCompletedOn(challenge.id, this.resolveChallengeSyncDate(challenge));
  }

  private getChallengeICloudTargets(): Array<{ challengeId: string; href: string }> {
    const targets = new Map<string, string>();
    for (const challenge of this.challenges.getAll()) {
      if (challenge.icloudReminderHref) {
        targets.set(challenge.id, challenge.icloudReminderHref);
      }
    }
    for (const event of this.calendar.getAll()) {
      if (!event.linkedChallengeId || !event.externalHref || !event.syncSourceId) continue;
      if (!parseAppleRemindersSourceId(event.syncSourceId)) continue;
      if (!targets.has(event.linkedChallengeId)) {
        targets.set(event.linkedChallengeId, event.externalHref);
      }
    }
    return [...targets.entries()].map(([challengeId, href]) => ({ challengeId, href }));
  }

  /** iCloud → App: Erledigt-Status auf verknüpfte Challenges anwenden (ohne Push-Loop). */
  syncChallengeCompletionFromICloud(completionByHref: Record<string, boolean>): boolean {
    let changed = false;
    this.persistChallengeAppleReminderLinks();
    this.suppressICloudPush = true;
    try {
      for (const { challengeId, href } of this.getChallengeICloudTargets()) {
        const challenge = this.challenges.getById(challengeId);
        if (!challenge) continue;

        const iCloudCompleted = this.getICloudCompletionStatus(completionByHref, href);
        if (iCloudCompleted === undefined) continue;

        const locallyCompleted = this.isChallengeCompletedInApp(challenge);
        const syncDate =
          challenge.recurrence === 'none'
            ? challenge.startDate
            : this.resolveChallengeSyncDate(challenge);

        if (iCloudCompleted && !locallyCompleted) {
          const completion = this.challenges.completeFromSync(challengeId, syncDate);
          if (completion) {
            this.coins.earn(
              completion.coinsEarned,
              `Challenge (iCloud): ${challenge.title}`,
              completion.id,
            );
            changed = true;
          }
        } else if (!iCloudCompleted && locallyCompleted) {
          const uncompleteDate =
            challenge.recurrence === 'none'
              ? this.challenges.getCompletionsForChallenge(challengeId).at(-1)?.date ?? syncDate
              : syncDate;
          if (!uncompleteDate) continue;
          const removed = this.challenges.uncomplete(challengeId, uncompleteDate);
          if (removed) {
            this.coins.removeByReferenceId(removed.id);
            changed = true;
          }
        }
      }
    } finally {
      this.suppressICloudPush = false;
    }
    return changed;
  }

  private fixMisclassifiedTodoCalendars(): void {
    let anyChanged = false;
    for (const account of this.calDavAccounts.getAll()) {
      let accountChanged = false;
      const calendars = account.calendars.map((cal) => {
        if (wasMisclassifiedAsReminders(cal)) {
          accountChanged = true;
          return { ...cal, calendarKind: 'events' as const };
        }
        return cal;
      });
      if (accountChanged) {
        anyChanged = true;
        this.calDavAccounts.update(account.id, { calendars });
      }
    }
    if (anyChanged) {
      this.persist();
    }
  }

  private cleanupOrphanedSyncEvents(): void {
    const accountIds = [
      ...this.calDavAccounts.getAll().map((a) => a.id),
      ...this.appleRemindersAccounts.getAll().map((a) => a.id),
    ];
    const removed = this.calendar.cleanupOrphanedSyncEvents(accountIds);
    if (removed > 0) {
      this.persist();
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private persist(): void {
    this.data.events = this.calendar.getAll();
    this.data.challenges = this.challenges.getAll();
    this.data.completions = this.challenges.getCompletions();
    this.data.eventRewardClaims = this.eventRewards.getAll();
    this.data.shopItems = this.shop.getItems();
    this.data.purchases = this.shop.getPurchases();
    this.data.bucketlistItems = this.bucketlist.getAll();
    this.data.calDavAccounts = this.calDavAccounts.getAll();
    this.data.appleRemindersAccounts = this.appleRemindersAccounts.getAll();
    this.repository.save(this.data);
    this.notify();
  }

  private notify(): void {
    this.cachedSnapshot = null;
    this.listeners.forEach((l) => l());
  }

  private buildSnapshot(): AppData {
    return {
      ...this.data,
      events: this.calendar.getAll(),
      challenges: this.challenges.getAll(),
      completions: this.challenges.getCompletions(),
      eventRewardClaims: this.eventRewards.getAll(),
      shopItems: this.shop.getItems(),
      purchases: this.shop.getPurchases(),
      bucketlistItems: this.bucketlist.getAll(),
      transactions: this.coins.getTransactions(),
      calDavAccounts: this.calDavAccounts.getAll(),
      appleRemindersAccounts: this.appleRemindersAccounts.getAll(),
    };
  }

  getSnapshot(): AppData {
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = this.buildSnapshot();
    }
    return this.cachedSnapshot;
  }

  getBalance(): number {
    return this.coins.getBalance();
  }

  // Calendar
  createEvent(...args: Parameters<CalendarService['create']>) {
    const result = this.calendar.create(...args);
    this.persist();
    return result;
  }

  updateEvent(...args: Parameters<CalendarService['update']>) {
    const result = this.calendar.update(...args);
    this.persist();
    return result;
  }

  deleteEvent(id: string) {
    this.eventRewards.removeForEvent(id);
    const result = this.calendar.delete(id);
    this.persist();
    return result;
  }

  assignEventToChallenge(eventId: string, challengeId: string) {
    const event = this.calendar.getById(eventId);
    if (!event?.readOnly || !event.date) return null;
    if (this.challenges.isCompletedOn(challengeId, event.date)) return null;
    const result = this.calendar.assignLinkedChallenge(eventId, challengeId);
    if (result) {
      this.persistAppleReminderLinkOnChallenge(challengeId, result);
      this.persist();
    }
    return result;
  }

  unlinkEventFromChallenge(eventId: string) {
    const result = this.calendar.assignLinkedChallenge(eventId, undefined);
    if (result) this.persist();
    return result;
  }

  assignEventToShopItem(eventId: string, shopItemId: string) {
    const event = this.calendar.getById(eventId);
    if (!event) return null;
    if (this.eventRewards.isClaimed(eventId)) return null;
    const result = this.calendar.assignLinkedShopItem(eventId, shopItemId);
    if (result) this.persist();
    return result;
  }

  unlinkEventFromShopItem(eventId: string) {
    const result = this.calendar.assignLinkedShopItem(eventId, undefined);
    if (result) this.persist();
    return result;
  }

  createShopItemFromEvent(
    eventId: string,
    input: { title: string; price?: number; description?: string },
  ) {
    const event = this.calendar.getById(eventId);
    if (!event) return null;
    const item = this.shop.create({
      title: input.title.trim(),
      description: input.description?.trim() || event.description,
      price: Math.max(1, input.price ?? 25),
      icon: 'gift',
      color: '#f59e0b',
    });
    this.calendar.assignLinkedShopItem(eventId, item.id);
    this.persist();
    return item;
  }

  claimEventReward(eventId: string) {
    const event = this.calendar.getById(eventId);
    if (!event?.linkedShopItemId || !event.date) return null;
    if (this.eventRewards.isClaimed(eventId)) return null;
    const item = this.shop.getById(event.linkedShopItemId);
    if (!item) return null;
    if (!this.coins.canSpend(item.price)) return null;
    const claim = this.eventRewards.claim({
      eventId,
      shopItemId: item.id,
      date: event.date,
      coinsSpent: item.price,
    });
    this.coins.spend(item.price, `Belohnung: ${item.title}`, claim.id);
    this.persist();
    return claim;
  }

  unclaimEventReward(eventId: string) {
    const removed = this.eventRewards.unclaim(eventId);
    if (!removed) return null;
    this.coins.removeByReferenceId(removed.id);
    this.persist();
    return removed;
  }

  createChallengeFromEvent(
    eventId: string,
    input: {
      title: string;
      coinReward?: number;
      category?: Challenge['category'];
      recurrence?: Challenge['recurrence'];
      weeklyDays?: number[];
    },
  ) {
    const event = this.calendar.getById(eventId);
    if (!event?.readOnly || !event.date) return null;
    const recurrence = input.recurrence ?? event.recurrence ?? 'none';
    const weeklyDays =
      recurrence === 'weekly'
        ? input.weeklyDays ??
          event.weeklyDays ?? [DateUtils.parseIsoDate(event.date).getDay()]
        : undefined;
    const challenge = this.challenges.create({
      title: input.title.trim(),
      description: event.description,
      icon: 'target',
      category: input.category ?? 'todo',
      coinReward: Math.max(1, input.coinReward ?? 10),
      recurrence,
      weeklyDays,
      startDate: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      color: '#8b5cf6',
      ...this.appleReminderLinkFromEvent(event),
    });
    this.calendar.assignLinkedChallenge(eventId, challenge.id);
    this.persistAppleReminderLinkOnChallenge(challenge.id, event);
    this.persist();
    devLog(`Challenge aus Termin: „${challenge.title}“`, 'ok', 'Challenge');
    return challenge;
  }

  acceptReminderAsChallenge(
    eventId: string,
    input: {
      title: string;
      coinReward: number;
      category: Challenge['category'];
      recurrence: Challenge['recurrence'];
      weeklyDays?: number[];
      icon?: string;
      color?: string;
      description?: string;
      startDate?: string;
      startTime?: string;
    },
  ) {
    const event = this.calendar.getById(eventId);
    if (!event || event.syncKind !== 'reminder') return null;
    const startDate = input.startDate ?? event.date ?? DateUtils.today();
    const startTime = input.startTime ?? event.startTime;
    const recurrence = input.recurrence;
    const weeklyDays =
      recurrence === 'weekly'
        ? input.weeklyDays ?? event.weeklyDays ?? [DateUtils.parseIsoDate(startDate).getDay()]
        : undefined;
    const challenge = this.challenges.create({
      title: input.title.trim(),
      description: input.description?.trim() || event.description,
      icon: input.icon ?? 'target',
      category: input.category,
      coinReward: Math.max(1, input.coinReward),
      recurrence,
      weeklyDays,
      startDate,
      startTime,
      endTime: event.endTime,
      color: input.color ?? '#8b5cf6',
      ...this.appleReminderLinkFromEvent(event),
    });
    this.linkAllReminderEventsToChallenge(event, challenge.id);
    this.persistAppleReminderLinkOnChallenge(challenge.id, event);
    this.persist();
    devLog(
      `Erinnerung übernommen: „${challenge.title}“ (${event.externalHref ?? event.id})`,
      'ok',
      'Challenge',
    );
    return challenge;
  }

  async completeReminderInICloud(eventId: string): Promise<void> {
    await this.setReminderCompletedInICloud(eventId, true);
  }

  async setReminderCompletedInICloud(eventId: string, completed: boolean): Promise<void> {
    const event = this.calendar.getById(eventId);
    if (!event?.syncSourceId || !event.externalHref) return;
    const parsed = parseAppleRemindersSourceId(event.syncSourceId);
    if (!parsed) return;
    const account = this.appleRemindersAccounts.getById(parsed.accountId);
    if (!account) return;
    await AppleRemindersApi.setReminderCompleted(
      account,
      parsed.listGuid,
      event.externalHref,
      completed,
    );
  }

  private findAppleReminderTarget(
    challengeId: string,
  ): { accountId: string; listGuid: string; href: string; eventId?: string } | null {
    const challenge = this.challenges.getById(challengeId);
    if (challenge?.icloudReminderHref && challenge.icloudReminderSourceId) {
      const parsed = parseAppleRemindersSourceId(challenge.icloudReminderSourceId);
      if (parsed) {
        return {
          accountId: parsed.accountId,
          listGuid: parsed.listGuid,
          href: challenge.icloudReminderHref,
        };
      }
    }

    const linkedEvent = this.calendar
      .getAll()
      .find((e) => e.linkedChallengeId === challengeId && e.externalHref && e.syncSourceId);

    if (linkedEvent?.externalHref && linkedEvent.syncSourceId) {
      const parsed = parseAppleRemindersSourceId(linkedEvent.syncSourceId);
      if (parsed) {
        return {
          accountId: parsed.accountId,
          listGuid: parsed.listGuid,
          href: linkedEvent.externalHref,
          eventId: linkedEvent.id,
        };
      }
    }

    return null;
  }

  async syncChallengeReminderInICloud(challengeId: string, completed: boolean): Promise<void> {
    this.persistAppleReminderLinkOnChallenge(challengeId);
    const target = this.findAppleReminderTarget(challengeId);
    if (!target) return;
    const account = this.appleRemindersAccounts.getById(target.accountId);
    if (!account) return;
    await AppleRemindersApi.setReminderCompleted(account, target.listGuid, target.href, completed);
  }

  async createChallengeICloudReminder(challengeId: string, sourceId: string): Promise<void> {
    const challenge = this.challenges.getById(challengeId);
    if (!challenge || challenge.icloudReminderHref) return;

    if (challenge.recurrence !== 'none') {
      throw new Error('Nur einmalige Challenges können als iCloud-Erinnerung angelegt werden.');
    }
    if (!challenge.startDate) {
      throw new Error('Bitte ein Datum für die Erinnerung angeben.');
    }

    const parsed = parseAppleRemindersSourceId(sourceId);
    if (!parsed) throw new Error('Ungültige Erinnerungs-Liste.');

    const account = this.appleRemindersAccounts.getById(parsed.accountId);
    if (!account) throw new Error('Apple-Reminders-Konto nicht gefunden.');

    const created = await AppleRemindersApi.createReminder(account, parsed.listGuid, {
      title: challenge.title,
      description: challenge.description,
      date: challenge.startDate,
      startTime: challenge.startTime,
    });

    this.challenges.update(challengeId, {
      icloudReminderHref: created.href,
      icloudReminderSourceId: sourceId,
    });
    this.persist();
  }

  dismissReminderSuggestion(eventId: string) {
    const result = this.calendar.dismissReminderSuggestion(eventId);
    if (result) this.persist();
    return result;
  }

  getReminderSuggestions() {
    return this.calendar.getReminderSuggestions(this.getLinkedReminderExternalHrefs());
  }

  /** Bereits übernommene Erinnerungen erneut mit Challenges verknüpfen (z. B. nach Sync-Duplikaten). */
  repairReminderChallengeLinks(): boolean {
    let changed = false;
    for (const challenge of this.challenges.getAll()) {
      if (!challenge.icloudReminderHref) continue;
      const href = this.normalizeReminderHref(challenge.icloudReminderHref);
      for (const event of this.calendar.getAll()) {
        if (!event.externalHref || event.linkedChallengeId) continue;
        if (this.normalizeReminderHref(event.externalHref) !== href) continue;
        if (
          challenge.icloudReminderSourceId &&
          event.syncSourceId &&
          event.syncSourceId !== challenge.icloudReminderSourceId
        ) {
          continue;
        }
        this.linkAllReminderEventsToChallenge(event, challenge.id);
        changed = true;
      }
    }
    if (changed) {
      devLog('Erinnerungs-Vorschläge mit bestehenden Challenges abgeglichen', 'ok', 'Repair');
      this.persist();
    }
    return changed;
  }

  // Challenges
  createChallenge(...args: Parameters<ChallengeService['create']>) {
    const result = this.challenges.create(...args);
    this.persist();
    return result;
  }

  updateChallenge(...args: Parameters<ChallengeService['update']>) {
    const result = this.challenges.update(...args);
    this.persist();
    return result;
  }

  async deleteChallenge(id: string) {
    if (isTauriApp()) {
      const target = this.findAppleReminderTarget(id);
      if (target) {
        const account = this.appleRemindersAccounts.getById(target.accountId);
        if (account) {
          await AppleRemindersApi.deleteReminder(account, target.listGuid, target.href);
        }
      }
    }
    const result = this.challenges.delete(id);
    this.persist();
    return result;
  }

  async completeChallenge(challengeId: string, date: string) {
    const completion = this.challenges.complete(challengeId, date);
    if (!completion) return null;
    const challenge = this.challenges.getById(challengeId);
    this.coins.earn(
      completion.coinsEarned,
      `Challenge: ${challenge?.title ?? 'Unbekannt'}`,
      completion.id,
    );
    this.persist();

    if (!this.suppressICloudPush) {
      await this.syncChallengeReminderInICloud(challengeId, true);
    }

    return completion;
  }

  async uncompleteChallenge(challengeId: string, date: string) {
    const removed = this.challenges.uncomplete(challengeId, date);
    if (!removed) return null;
    this.coins.removeByReferenceId(removed.id);
    this.persist();

    if (!this.suppressICloudPush) {
      await this.syncChallengeReminderInICloud(challengeId, false);
    }

    return removed;
  }

  // Bucketlist
  createBucketlistItem(...args: Parameters<BucketlistService['create']>) {
    const result = this.bucketlist.create(...args);
    this.persist();
    return result;
  }

  updateBucketlistItem(...args: Parameters<BucketlistService['update']>) {
    const result = this.bucketlist.update(...args);
    this.persist();
    return result;
  }

  deleteBucketlistItem(id: string) {
    const result = this.bucketlist.delete(id);
    this.persist();
    return result;
  }

  toggleBucketlistItem(id: string) {
    const result = this.bucketlist.toggleComplete(id);
    if (result) this.persist();
    return result;
  }

  // Shop
  createShopItem(...args: Parameters<ShopService['create']>) {
    const result = this.shop.create(...args);
    this.persist();
    return result;
  }

  updateShopItem(...args: Parameters<ShopService['update']>) {
    const result = this.shop.update(...args);
    this.persist();
    return result;
  }

  deleteShopItem(id: string) {
    const result = this.shop.delete(id);
    this.persist();
    return result;
  }

  purchaseShopItem(itemId: string) {
    const result = this.shop.purchase(itemId);
    this.persist();
    return result;
  }

  createCalDavAccount(...args: Parameters<CalDavAccountService['create']>) {
    const result = this.calDavAccounts.create(...args);
    this.persist();
    return result;
  }

  updateCalDavAccount(...args: Parameters<CalDavAccountService['update']>) {
    const result = this.calDavAccounts.update(...args);
    this.persist();
    return result;
  }

  deleteCalDavAccount(id: string) {
    this.calendar.removeAllForAccount(id);
    const result = this.calDavAccounts.delete(id);
    this.persist();
    return result;
  }

  async syncCalDavAccount(accountId: string): Promise<SyncResult> {
    const account = this.calDavAccounts.getById(accountId);
    if (!account) throw new Error('Konto nicht gefunden.');
    devLog(`CalDAV Sync start: ${account.name} (${getEnabledCalendars(account).length} Kalender)`, 'info', 'Sync');
    try {
      const result = await this.calDavSync.syncAccount(account);
      devLog(
        `CalDAV ${account.name}: +${result.imported} neu, ~${result.updated} aktualisiert, −${result.removed} entfernt`,
        'ok',
        'Sync',
      );
      if (result.failedCalendars.length > 0) {
        devLog(`CalDAV ${account.name} übersprungen: ${result.failedCalendars.join(' · ')}`, 'warn', 'Sync');
      }
      const partialWarning =
        result.failedCalendars.length > 0
          ? `${result.failedCalendars.length} Kalender übersprungen: ${result.failedCalendars.map((f) => f.split(':')[0]).join(', ')}`
          : undefined;
      this.updateCalDavAccount(accountId, {
        lastSyncAt: new Date().toISOString(),
        lastSyncError: partialWarning,
      });
      this.persist();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync fehlgeschlagen';
      devLog(`CalDAV ${account.name} fehlgeschlagen: ${message}`, 'error', 'Sync');
      this.updateCalDavAccount(accountId, { lastSyncError: message });
      this.persist();
      throw error;
    }
  }

  async syncAllCalDavAccounts(): Promise<void> {
    const accounts = this.calDavAccounts.getAll().filter((a) => a.enabled);
    await Promise.all(
      accounts.map((account) =>
        this.syncCalDavAccount(account.id).catch(() => {
          // Fehler stehen am jeweiligen Konto
        }),
      ),
    );
  }

  createAppleRemindersAccount(...args: Parameters<AppleRemindersAccountService['create']>) {
    const result = this.appleRemindersAccounts.create(...args);
    this.persist();
    return result;
  }

  updateAppleRemindersAccount(...args: Parameters<AppleRemindersAccountService['update']>) {
    const result = this.appleRemindersAccounts.update(...args);
    this.persist();
    return result;
  }

  deleteAppleRemindersAccount(id: string) {
    this.calendar.removeAllForAccount(id);
    const result = this.appleRemindersAccounts.delete(id);
    this.persist();
    return result;
  }

  async syncAppleRemindersAccount(accountId: string): Promise<SyncResult> {
    const account = this.appleRemindersAccounts.getById(accountId);
    if (!account) throw new Error('Apple-Reminders-Konto nicht gefunden.');
    devLog(
      `Apple Reminders Sync start: ${account.name} (${getEnabledAppleRemindersLists(account).length} Listen)`,
      'info',
      'Sync',
    );
    try {
      this.persistChallengeAppleReminderLinks();

      try {
        const discovered = await AppleRemindersApi.discoverLists(account);
        if (discovered.length > 0) {
          devLog(`Listen-Katalog: ${discovered.length} Listen von iCloud`, 'info', 'Sync');
          this.appleRemindersAccounts.update(accountId, {
            lists: mergeAppleReminderLists(account.lists, discovered),
          });
        }
      } catch {
        devLog('Listen-Katalog-Refresh übersprungen', 'warn', 'Sync');
      }

      const result = await this.appleRemindersSync.syncAccount(account);
      let changed = this.syncLinkedChallengesFromAppleReminders();
      if (result.reminderCompletionByHref) {
        const completionCount = Object.keys(result.reminderCompletionByHref).length;
        devLog(`Erledigt-Status: ${completionCount} Erinnerungen aus iCloud`, 'info', 'Sync');
        changed =
          this.syncChallengeCompletionFromICloud(result.reminderCompletionByHref) || changed;
      }
      if (changed) {
        devLog('Challenge-Links / Erledigt-Status aus iCloud angewendet', 'ok', 'Sync');
        this.persist();
      }
      devLog(
        `Apple ${account.name}: +${result.imported} neu, ~${result.updated} aktualisiert, −${result.removed} entfernt`,
        'ok',
        'Sync',
      );
      if (result.failedCalendars.length > 0) {
        devLog(`Apple ${account.name} übersprungen: ${result.failedCalendars.join(' · ')}`, 'warn', 'Sync');
      }
      this.updateAppleRemindersAccount(accountId, {
        lastSyncAt: new Date().toISOString(),
        lastSyncError:
          result.failedCalendars.length > 0
            ? `${result.failedCalendars.length} Listen übersprungen: ${result.failedCalendars.join(' · ')}`
            : undefined,
      });
      this.persist();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync fehlgeschlagen';
      devLog(`Apple ${account.name} fehlgeschlagen: ${message}`, 'error', 'Sync');
      this.updateAppleRemindersAccount(accountId, { lastSyncError: message });
      this.persist();
      throw error;
    }
  }

  async syncAllAppleRemindersAccounts(): Promise<void> {
    const accounts = this.appleRemindersAccounts.getAll().filter((a) => a.enabled);
    await Promise.all(
      accounts.map((account) =>
        this.syncAppleRemindersAccount(account.id).catch(() => {
          // Fehler stehen am jeweiligen Konto
        }),
      ),
    );
  }
}

let singleton: AppStateService | null = null;

export function getAppState(): AppStateService {
  if (!singleton) singleton = new AppStateService();
  return singleton;
}
