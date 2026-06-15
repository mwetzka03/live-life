import { useEffect, useState } from 'react';
import { CheckCircle2, Coins, Target, Undo2 } from 'lucide-react';
import { DateUtils } from '../../domain/services/DateUtils';
import { StreakMultiplier } from '../../domain/services/StreakMultiplier';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { AppIcon } from '../common/AppIcon';
import { FitPager } from '../common/FitPager';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { getChallengeAppearance } from '../../lib/challengeDisplay';

const PAGE_SIZE = 5;

export function CompletedChallengesTodayPanel() {
  const { app } = useAppState();
  const { t } = useLocale();
  const today = DateUtils.today();
  const completions = app.challenges.getCompletionsForDate(today);
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(completions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = completions.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount, completions.length]);

  if (completions.length === 0) return null;

  const totalCoins = completions.reduce((sum, c) => sum + c.coinsEarned, 0);

  return (
    <CollapsibleSection
      className="ll-scheduled-rewards-panel ll-completed-challenges-panel"
      defaultCollapsed
      headerIcon={<Target size={18} />}
      title={t('calendar.completedChallengesToday')}
      headerRight={<span>{DateUtils.formatGerman(today)}</span>}
      collapsedSummary={t('calendar.completedChallengesSummary', {
        count: completions.length,
        coins: totalCoins,
      })}
    >
      <p className="ll-scheduled-rewards-summary">
        <Coins size={14} />
        {t('calendar.completedChallengesSummary', { count: completions.length, coins: totalCoins })}
      </p>

      <ul className="ll-scheduled-rewards-list">
        {pageItems.map((completion) => {
          const challenge = app.challenges.getById(completion.challengeId);
          if (!challenge) return null;
          const { icon, color } = getChallengeAppearance(
            challenge,
            app.challengeGroups.getById.bind(app.challengeGroups),
          );
          return (
            <li
              key={completion.id}
              className="ll-scheduled-reward claimed"
              style={{ borderColor: color }}
            >
              <AppIcon name={icon} size={16} color={color} />
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
                  <CheckCircle2 size={14} /> +{completion.coinsEarned}
                  {(completion.multiplier ?? 1) > 1 && (
                    <> · {StreakMultiplier.format(completion.multiplier ?? 1)}</>
                  )}
                </span>
                <button
                  type="button"
                  className="ll-icon-btn small"
                  onClick={() => void app.uncompleteChallenge(challenge.id, completion.date)}
                  aria-label={t('challenges.reset')}
                  title={t('challenges.reset')}
                >
                  <Undo2 size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {completions.length > PAGE_SIZE && (
        <FitPager
          className="ll-fit-pager-compact"
          page={safePage}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      )}
    </CollapsibleSection>
  );
}
