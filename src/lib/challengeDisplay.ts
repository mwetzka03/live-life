import type { Challenge, ChallengeGroup } from '../domain/models/AppData';

export function getChallengeAppearance(
  challenge: Challenge,
  resolveGroup?: (groupId: string) => ChallengeGroup | undefined,
): { icon: string; color: string } {
  if (challenge.groupId && resolveGroup) {
    const group = resolveGroup(challenge.groupId);
    if (group) {
      return { icon: group.icon, color: group.color };
    }
  }
  return { icon: challenge.icon, color: challenge.color };
}
