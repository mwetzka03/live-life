import type { Challenge, ChallengeGroup } from '../models/AppData';
import { IdGenerator, DateUtils } from './DateUtils';

export type ChallengeGroupInput = Omit<ChallengeGroup, 'id' | 'createdAt' | 'updatedAt'>;

export class ChallengeGroupService {
  private groups: ChallengeGroup[];
  private getChallenge: (id: string) => Challenge | undefined;

  constructor(groups: ChallengeGroup[], getChallenge: (id: string) => Challenge | undefined) {
    this.groups = groups;
    this.getChallenge = getChallenge;
  }

  getAll(): ChallengeGroup[] {
    return [...this.groups].sort((a, b) => a.title.localeCompare(b.title));
  }

  getById(id: string): ChallengeGroup | undefined {
    return this.groups.find((g) => g.id === id);
  }

  getChallengesForGroup(groupId: string): Challenge[] {
    const group = this.getById(groupId);
    if (!group) return [];
    return group.challengeIds
      .map((id) => this.getChallenge(id))
      .filter((c): c is Challenge => !!c);
  }

  isGroupComplete(groupId: string, hasAnyCompletion: (challengeId: string) => boolean): boolean {
    const challenges = this.getChallengesForGroup(groupId);
    if (challenges.length === 0) return false;
    return challenges.every((c) => hasAnyCompletion(c.id));
  }

  getProgress(groupId: string, hasAnyCompletion: (challengeId: string) => boolean): { done: number; total: number } {
    const challenges = this.getChallengesForGroup(groupId);
    const done = challenges.filter((c) => hasAnyCompletion(c.id)).length;
    return { done, total: challenges.length };
  }

  create(input: ChallengeGroupInput): ChallengeGroup {
    const now = DateUtils.nowIso();
    const group: ChallengeGroup = {
      ...input,
      id: IdGenerator.create(),
      createdAt: now,
      updatedAt: now,
    };
    this.groups.push(group);
    return group;
  }

  update(id: string, input: Partial<ChallengeGroupInput>): ChallengeGroup | null {
    const index = this.groups.findIndex((g) => g.id === id);
    if (index === -1) return null;
    const updated: ChallengeGroup = {
      ...this.groups[index],
      ...input,
      id,
      updatedAt: DateUtils.nowIso(),
    };
    this.groups[index] = updated;
    return updated;
  }

  delete(id: string): boolean {
    const before = this.groups.length;
    this.groups = this.groups.filter((g) => g.id !== id);
    return this.groups.length < before;
  }

  addChallengeToGroup(groupId: string, challengeId: string): ChallengeGroup | null {
    const group = this.getById(groupId);
    if (!group || group.challengeIds.includes(challengeId)) return group ?? null;
    return this.update(groupId, { challengeIds: [...group.challengeIds, challengeId] });
  }

  removeChallengeFromGroup(groupId: string, challengeId: string): ChallengeGroup | null {
    const group = this.getById(groupId);
    if (!group) return null;
    return this.update(groupId, {
      challengeIds: group.challengeIds.filter((id) => id !== challengeId),
    });
  }
}
