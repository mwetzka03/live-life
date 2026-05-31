import type { Challenge, ChallengeCompletion, RecurrenceType } from '../models/AppData';
import { IdGenerator, DateUtils } from './DateUtils';
import { StreakMultiplier } from './StreakMultiplier';

export type ChallengeInput = Omit<Challenge, 'id' | 'createdAt' | 'updatedAt'>;

export class ChallengeService {
  private challenges: Challenge[];
  private completions: ChallengeCompletion[];

  constructor(challenges: Challenge[], completions: ChallengeCompletion[]) {
    this.challenges = challenges;
    this.completions = completions;
  }

  getAll(): Challenge[] {
    return [...this.challenges].sort((a, b) => a.title.localeCompare(b.title));
  }

  getById(id: string): Challenge | undefined {
    return this.challenges.find((c) => c.id === id);
  }

  getCompletions(): ChallengeCompletion[] {
    return [...this.completions];
  }

  getCompletionsForDate(date: string): ChallengeCompletion[] {
    return this.completions.filter((c) => c.date === date);
  }

  getCompletionsForChallenge(challengeId: string): ChallengeCompletion[] {
    return this.completions.filter((c) => c.challengeId === challengeId);
  }

  isCompletedOn(challengeId: string, date: string): boolean {
    return this.completions.some((c) => c.challengeId === challengeId && c.date === date);
  }

  hasAnyCompletion(challengeId: string): boolean {
    return this.getCompletionsForChallenge(challengeId).length > 0;
  }

  isDueOn(challenge: Challenge, date: string): boolean {
    if (date < challenge.startDate) return false;
    if (challenge.endDate && date > challenge.endDate) return false;

    switch (challenge.recurrence) {
      case 'none':
        if (this.hasAnyCompletion(challenge.id)) return false;
        return date === challenge.startDate;
      case 'irregular':
        return true;
      case 'daily':
        return true;
      case 'weekly':
        return (challenge.weeklyDays ?? []).includes(DateUtils.parseIsoDate(date).getDay());
      case 'monthly':
        return (
          DateUtils.parseIsoDate(date).getDate() === DateUtils.parseIsoDate(challenge.startDate).getDate()
        );
      default:
        return false;
    }
  }

  isDoneOn(challenge: Challenge, date: string): boolean {
    if (challenge.recurrence === 'irregular') return false;
    if (challenge.recurrence === 'none') return this.hasAnyCompletion(challenge.id);
    return this.isCompletedOn(challenge.id, date);
  }

  getDueForDate(date: string): Challenge[] {
    return this.getAll().filter((c) => this.isDueOn(c, date));
  }

  getStreak(challengeId: string): number {
    return this.getStreakEndingOn(challengeId, DateUtils.today());
  }

  getStreakEndingOn(challengeId: string, date: string): number {
    const challenge = this.getById(challengeId);
    if (!challenge || challenge.recurrence === 'irregular' || challenge.recurrence === 'none') {
      return 0;
    }

    const dates = new Set(
      this.getCompletionsForChallenge(challengeId).map((c) => c.date),
    );

    let streak = 0;
    let expected = date;

    while (dates.has(expected)) {
      streak++;
      expected = DateUtils.addDays(expected, -1);
    }

    return streak;
  }

  getMultiplierForDate(challengeId: string, date: string): number {
    const streakAfter = this.getStreakEndingOn(challengeId, date) + 1;
    return StreakMultiplier.fromStreak(streakAfter);
  }

  getProjectedReward(challenge: Challenge, date: string): {
    base: number;
    multiplier: number;
    total: number;
  } {
    const multiplier = this.getMultiplierForDate(challenge.id, date);
    return {
      base: challenge.coinReward,
      multiplier,
      total: StreakMultiplier.calculateReward(
        challenge.coinReward,
        this.getStreakEndingOn(challenge.id, date) + 1,
      ),
    };
  }

  create(input: ChallengeInput): Challenge {
    const now = DateUtils.nowIso();
    const challenge: Challenge = {
      ...input,
      id: IdGenerator.create(),
      createdAt: now,
      updatedAt: now,
    };
    this.challenges.push(challenge);
    return challenge;
  }

  update(id: string, input: Partial<ChallengeInput>): Challenge | null {
    const index = this.challenges.findIndex((c) => c.id === id);
    if (index === -1) return null;
    const updated: Challenge = {
      ...this.challenges[index],
      ...input,
      id,
      updatedAt: DateUtils.nowIso(),
    };
    this.challenges[index] = updated;
    return updated;
  }

  delete(id: string): boolean {
    const before = this.challenges.length;
    this.challenges = this.challenges.filter((c) => c.id !== id);
    this.completions = this.completions.filter((c) => c.challengeId !== id);
    return this.challenges.length < before;
  }

  complete(challengeId: string, date: string): ChallengeCompletion | null {
    const challenge = this.getById(challengeId);
    if (!challenge) return null;
    if (!this.isDueOn(challenge, date)) return null;
    return this.recordCompletion(challenge, challengeId, date);
  }

  /** iCloud-Sync: ohne isDueOn-Prüfung (Datum kann von der Challenge abweichen). */
  completeFromSync(challengeId: string, date: string): ChallengeCompletion | null {
    const challenge = this.getById(challengeId);
    if (!challenge) return null;
    return this.recordCompletion(challenge, challengeId, date);
  }

  private recordCompletion(
    challenge: Challenge,
    challengeId: string,
    date: string,
  ): ChallengeCompletion | null {
    if (challenge.recurrence === 'none' && this.hasAnyCompletion(challengeId)) {
      return null;
    }

    if (challenge.recurrence !== 'irregular' && this.isCompletedOn(challengeId, date)) {
      return null;
    }

    const streakAfter = this.getStreakEndingOn(challengeId, date) + 1;
    const multiplier = StreakMultiplier.fromStreak(streakAfter);
    const coinsEarned = StreakMultiplier.calculateReward(challenge.coinReward, streakAfter);

    const completion: ChallengeCompletion = {
      id: IdGenerator.create(),
      challengeId,
      date,
      coinsEarned,
      baseReward: challenge.coinReward,
      multiplier,
      completedAt: DateUtils.nowIso(),
    };
    this.completions.push(completion);
    return completion;
  }

  uncomplete(challengeId: string, date: string): ChallengeCompletion | null {
    const challenge = this.getById(challengeId);
    if (!challenge) return null;

    if (challenge.recurrence === 'none') {
      const completions = this.getCompletionsForChallenge(challengeId);
      if (completions.length === 0) return null;
      const [removed] = completions.slice(-1);
      this.completions = this.completions.filter((c) => c.id !== removed.id);
      return removed;
    }

    if (challenge.recurrence === 'irregular') {
      const index = this.completions.findIndex(
        (c) => c.challengeId === challengeId && c.date === date,
      );
      if (index === -1) return null;
      const [removed] = this.completions.splice(index, 1);
      return removed;
    }

    const index = this.completions.findIndex(
      (c) => c.challengeId === challengeId && c.date === date,
    );
    if (index === -1) return null;
    const [removed] = this.completions.splice(index, 1);
    return removed;
  }

  normalizeRecurrence(value: RecurrenceType): RecurrenceType {
    return value;
  }
}
