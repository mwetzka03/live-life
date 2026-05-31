import { CheckCircle2, Coins, Gift } from 'lucide-react';
import type { CalendarViewMode } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { getScheduledRewardsInRange, getViewRange } from '../../lib/scheduledRewards';
import { AppIcon } from '../common/AppIcon';

interface ScheduledRewardsPanelProps {
  viewMode: CalendarViewMode;
  selectedDate: string;
}

export function ScheduledRewardsPanel({ viewMode, selectedDate }: ScheduledRewardsPanelProps) {
  const { app, balance } = useAppState();
  const { t } = useLocale();
  const { start, end } = getViewRange(viewMode, selectedDate);
  const rewards = getScheduledRewardsInRange(app, start, end, balance);
  const pending = rewards.filter((r) => !r.claimed);

  if (rewards.length === 0) return null;

  const periodLabel =
    viewMode === 'day'
      ? DateUtils.formatGerman(selectedDate)
      : viewMode === 'week'
        ? `${DateUtils.formatGerman(start)} – ${DateUtils.formatGerman(end)}`
        : DateUtils.formatMonthYear(selectedDate);

  const totalPendingCost = pending.reduce((sum, r) => sum + r.item.price, 0);

  return (
    <section className="ll-scheduled-rewards-panel">
      <header>
        <div>
          <Gift size={18} />
          <h2>{t('calendar.scheduledRewards')}</h2>
        </div>
        <span>{periodLabel}</span>
      </header>

      {pending.length > 0 && (
        <p className="ll-scheduled-rewards-summary">
          <Coins size={14} />
          {balance >= totalPendingCost ? (
            <>{t('calendar.rewardsEnough', { balance, count: pending.length })}</>
          ) : (
            <>
              {t('calendar.rewardsShort', {
                shortfall: Math.max(0, totalPendingCost - balance),
                count: pending.length,
                total: totalPendingCost,
              })}
            </>
          )}
        </p>
      )}

      <ul className="ll-scheduled-rewards-list">
        {rewards.map(({ event, item, claimed, canAfford, shortfall }) => (
          <li
            key={event.id}
            className={`ll-scheduled-reward${claimed ? ' claimed' : ''}${!claimed && !canAfford ? ' short' : ''}`}
            style={{ borderColor: item.color }}
          >
            <AppIcon name={item.icon} size={16} color={item.color} />
            <div className="ll-scheduled-reward-body">
              <div className="ll-scheduled-reward-title">
                <strong>{item.title}</strong>
                <span className="ll-scheduled-reward-event">{event.title}</span>
              </div>
              <span>
                {DateUtils.formatEventDate(event.date)}
                {event.startTime ? ` · ${DateUtils.formatTime(event.startTime)}` : ''}
              </span>
            </div>
            <div className="ll-scheduled-reward-status">
              {claimed ? (
                <span className="ok">
                  <CheckCircle2 size={14} /> {t('calendar.rewardClaimed')}
                </span>
              ) : canAfford ? (
                <span className="ok">
                  <Coins size={14} /> {t('calendar.rewardReady', { price: item.price })}
                </span>
              ) : (
                <span className="warn">
                  <Coins size={14} /> {t('calendar.rewardNeedMore', { shortfall })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
