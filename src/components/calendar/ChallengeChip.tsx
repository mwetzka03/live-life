import { Flame, Target } from 'lucide-react';
import type { Challenge } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { StreakMultiplier } from '../../domain/services/StreakMultiplier';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { AppIcon } from '../common/AppIcon';

function ChallengeReward({ challenge, date, done }: { challenge: Challenge; date: string; done: boolean }) {
  const { app } = useAppState();

  if (done) {
    const completion = app.challenges
      .getCompletionsForDate(date)
      .find((c) => c.challengeId === challenge.id);
    const earned = completion?.coinsEarned ?? challenge.coinReward;
    const mult = completion?.multiplier ?? 1;
    return (
      <small className="ll-reward">
        +{earned}
        {mult > 1 && <em>{StreakMultiplier.format(mult)}</em>}
      </small>
    );
  }

  const projected = app.challenges.getProjectedReward(challenge, date);
  return (
    <small className="ll-reward">
      +{projected.total}
      {projected.multiplier > 1 && <em>{StreakMultiplier.format(projected.multiplier)}</em>}
    </small>
  );
}

interface ChallengeChipProps {
  challenge: Challenge;
  date: string;
  showTime?: boolean;
  compact?: boolean;
  onToggle?: () => void;
}

export function ChallengeChip({ challenge, date, showTime = false, compact = false, onToggle }: ChallengeChipProps) {
  const { app } = useAppState();
  const { runWithLoading } = useLoading();
  const { t } = useLocale();
  const done = app.challenges.isDoneOn(challenge, date);
  const streak = app.challenges.getStreak(challenge.id);
  const canToggleOff = challenge.recurrence !== 'irregular';

  const toggle = () => {
    void runWithLoading(async () => {
      if (done && canToggleOff) await app.uncompleteChallenge(challenge.id, date);
      else await app.completeChallenge(challenge.id, date);
      onToggle?.();
    }, done ? t('loading.challengeReopen') : t('loading.challengeComplete'));
  };

  return (
    <button
      type="button"
      className={`ll-chip challenge${done ? ' done' : ''}${compact ? ' compact' : ''}`}
      style={{ borderColor: challenge.color, background: `${challenge.color}22` }}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
    >
      {showTime && challenge.startTime && (
        <time className="ll-chip-time">{DateUtils.formatTime(challenge.startTime)}</time>
      )}
      <AppIcon name={challenge.icon} size={14} color={challenge.color} />
      <span>{challenge.title}</span>
      {!compact && streak > 0 && (
        <span className="ll-chip-streak">
          <Flame size={11} /> {streak}
        </span>
      )}
      <ChallengeReward challenge={challenge} date={date} done={done} />
    </button>
  );
}

export function TodayChallengesPanel() {
  const { app } = useAppState();
  const { t } = useLocale();
  const today = DateUtils.today();
  const dueToday = app.challenges.getDueForDate(today);
  const doneCount = dueToday.filter((c) => app.challenges.isCompletedOn(c.id, today)).length;

  if (dueToday.length === 0) return null;

  return (
    <section className="ll-today-panel">
      <header>
        <div>
          <Target size={18} />
          <h2>{t('calendar.todayChallenges')}</h2>
        </div>
        <span>{t('calendar.todayProgress', { done: doneCount, total: dueToday.length })}</span>
      </header>
      <div className="ll-today-challenges">
        {dueToday.map((ch) => (
          <ChallengeChip key={ch.id} challenge={ch} date={today} showTime />
        ))}
      </div>
    </section>
  );
}
