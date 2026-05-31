export class StreakMultiplier {
  static readonly MAX = 5;
  static readonly BASE = 1;
  static readonly STEP = 0.5;
  static readonly INTERVAL = 5;

  /** Streak 5 → ×1.5, 10 → ×2.0, … max ×5.0 ab Streak 40 */
  static fromStreak(streak: number): number {
    if (streak <= 0) return this.BASE;
    const tiers = Math.floor(streak / this.INTERVAL);
    return Math.min(this.MAX, this.BASE + tiers * this.STEP);
  }

  static calculateReward(baseReward: number, streak: number): number {
    return Math.round(baseReward * this.fromStreak(streak));
  }

  static format(multiplier: number): string {
    const label = Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(1);
    return `×${label}`;
  }
}
