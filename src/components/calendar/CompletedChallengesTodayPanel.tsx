import { CheckCircle2, Coins, Target } from 'lucide-react';
import { DateUtils } from '../../domain/services/DateUtils';
import { StreakMultiplier } from '../../domain/services/StreakMultiplier';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { AppIcon } from '../common/AppIcon';

export function CompletedChallengesTodayPanel() {
  const { app } = useAppState();
  const { t } = useLocale();
  const today = DateUtils.today();
  const completions = app.challenges.getCompletionsForDate(today);

  if (completions.length === 0) return null;

  const totalCoins = completions.reduce((sum, c) => sum + c.coinsEarned, 0);

  return (
    <section className="ll-scheduled-rewards-panel ll-completed-challenges-panel">
      <header>
        <div>
          <Target size={18} />
          <h2>{t('calendar.completedChallengesToday')}</h2>
        </div>
        <span>{DateUtils.formatGerman(today)}</span>
      </header>

      <p className="ll-scheduled-rewards-summary">
        <Coins size={14} />
        {t('calendar.completedChallengesSummary', { count: completions.length, coins: totalCoins })}
      </p>

      <ul className="ll-scheduled-rewards-list">
        {completions.map((completion) => {
          const challenge = app.challenges.getById(completion.challengeId);
          if (!challenge) return null;
          return (
            <li
              key={completion.id}
              className="ll-scheduled-reward claimed"
              style={{ borderColor: challenge.color }}
            >
              <AppIcon name={challenge.icon} size={16} color={challenge.color} />
              <div className="ll-scheduled-reward-body">
                <div className="ll-scheduled-reward-title">
                  <strong>{challenge.title}</strong>
                </div>
                <span>
                  {challenge.startTime ? DateUtils.formatTime(challenge.startTime) : t('calendar.completedToday')}
                </span>
              </div>
              <div className="ll-scheduled-reward-status">
                <span className="ok">
                  <CheckCircle2 size={14} />                   +{completion.coinsEarned}
                  {(completion.multiplier ?? 1) > 1 && (
                    <> · {StreakMultiplier.format(completion.multiplier ?? 1)}</>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
