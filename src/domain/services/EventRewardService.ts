import type { EventRewardClaim } from '../models/AppData';
import { IdGenerator, DateUtils } from './DateUtils';

export class EventRewardService {
  private claims: EventRewardClaim[];

  constructor(claims: EventRewardClaim[]) {
    this.claims = claims;
  }

  getAll(): EventRewardClaim[] {
    return [...this.claims];
  }

  isClaimed(eventId: string): boolean {
    return this.claims.some((c) => c.eventId === eventId);
  }

  getClaim(eventId: string): EventRewardClaim | undefined {
    return this.claims.find((c) => c.eventId === eventId);
  }

  getClaimsForRange(start: string, end: string): EventRewardClaim[] {
    return this.claims.filter((c) => c.date >= start && c.date <= end);
  }

  claim(input: {
    eventId: string;
    shopItemId: string;
    date: string;
    coinsSpent: number;
  }): EventRewardClaim {
    this.claims = this.claims.filter((c) => c.eventId !== input.eventId);
    const claim: EventRewardClaim = {
      id: IdGenerator.create(),
      eventId: input.eventId,
      shopItemId: input.shopItemId,
      date: input.date,
      coinsSpent: input.coinsSpent,
      claimedAt: DateUtils.nowIso(),
    };
    this.claims.push(claim);
    return claim;
  }

  unclaim(eventId: string): EventRewardClaim | null {
    const index = this.claims.findIndex((c) => c.eventId === eventId);
    if (index === -1) return null;
    const [removed] = this.claims.splice(index, 1);
    return removed;
  }

  removeForEvent(eventId: string): void {
    this.claims = this.claims.filter((c) => c.eventId !== eventId);
  }

  removeForEvents(eventIds: string[]): void {
    const ids = new Set(eventIds);
    this.claims = this.claims.filter((c) => !ids.has(c.eventId));
  }
}
