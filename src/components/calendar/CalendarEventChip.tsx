import { CheckCircle2, Circle, Coins, Info, Repeat } from 'lucide-react';
import type { CalendarEvent } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { AppIcon } from '../common/AppIcon';

interface CalendarEventChipProps {
  event: CalendarEvent;
  date: string;
  showTime?: boolean;
  onOpenDetails: (id: string) => void;
}

export function CalendarEventChip({
  event,
  date,
  showTime = false,
  onOpenDetails,
}: CalendarEventChipProps) {
  const { app, balance } = useAppState();
  const { runWithLoading } = useLoading();
  const { t } = useLocale();
  const challenge = event.linkedChallengeId ? app.challenges.getById(event.linkedChallengeId) : undefined;
  const shopItem = event.linkedShopItemId ? app.shop.getById(event.linkedShopItemId) : undefined;
  const challengeDone = challenge ? app.challenges.isDoneOn(challenge, date) : false;
  const rewardClaimed = app.eventRewards.isClaimed(event.id);
  const isShop = !!shopItem;
  const isChallenge = !!challenge;
  const isLinked = isShop || isChallenge;
  const done = isShop ? rewardClaimed : challengeDone;
  const canAffordShop = shopItem ? balance >= shopItem.price : false;

  const toggle = () => {
    if (isShop) {
      void runWithLoading(async () => {
        if (rewardClaimed) app.unclaimEventReward(event.id);
        else app.claimEventReward(event.id);
      }, rewardClaimed ? t('loading.rewardUndo') : t('loading.rewardRedeem'));
      return;
    }
    if (challenge) {
      const canToggleOff = challenge.recurrence !== 'irregular';
      void runWithLoading(async () => {
        if (challengeDone && canToggleOff) {
          await app.uncompleteChallenge(challenge.id, date);
        } else {
          await app.completeChallenge(challenge.id, date);
        }
      }, challengeDone ? t('loading.challengeReopen') : t('loading.challengeComplete'));
    }
  };

  const handleClick = () => {
    if (isLinked) {
      if (isShop && !rewardClaimed && !canAffordShop) {
        onOpenDetails(event.id);
        return;
      }
      toggle();
    } else {
      onOpenDetails(event.id);
    }
  };

  const accentColor = shopItem?.color ?? challenge?.color ?? event.color;
  const accentIcon =
    shopItem?.icon ?? challenge?.icon ?? (event.syncKind === 'reminder' ? 'bell' : event.icon);

  return (
    <div
      className={`ll-sync-event${isLinked ? ' linked' : ''}${done ? ' done' : ''}${isShop ? ' shop-reward' : ''}${event.syncKind === 'reminder' ? ' reminder-suggestion' : ''}${isShop && !done && !canAffordShop ? ' unaffordable' : ''}`}
      style={{ borderColor: event.color, background: `${event.color}22` }}
    >
      <button
        type="button"
        className="ll-sync-event-body"
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        <div className="ll-sync-event-row">
          {isLinked && (
            <span className="ll-chip-check" aria-hidden>
              {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </span>
          )}
          {showTime && event.startTime && (
            <time className="ll-chip-time">{DateUtils.formatTime(event.startTime)}</time>
          )}
          <AppIcon name={accentIcon} size={14} color={accentColor} />
          {event.isRecurring && (
            <Repeat size={12} className="ll-chip-recurring" aria-label={t('common.recurring')} />
          )}
          {isShop && shopItem && (
            <span className="ll-cost">
              <Coins size={11} /> {shopItem.price}
            </span>
          )}
          {showTime && event.endTime && (
            <span className="ll-chip-end">– {DateUtils.formatTime(event.endTime)}</span>
          )}
          {isChallenge && challenge && !challengeDone && (
            <small className="ll-reward">
              +{app.challenges.getProjectedReward(challenge, date).total}
            </small>
          )}
          {isChallenge && challenge && challengeDone && (
            <small className="ll-reward">
              +{app.challenges.getCompletionsForDate(date).find((c) => c.challengeId === challenge.id)?.coinsEarned ?? challenge.coinReward}
            </small>
          )}
          {isShop && shopItem && !done && !canAffordShop && (
            <small className="ll-cost-warn">−{shopItem.price - balance}</small>
          )}
        </div>
        <span className="ll-sync-event-title">{event.title}</span>
      </button>
      <button
        type="button"
        className="ll-sync-event-info"
        title={t('common.details')}
        aria-label={t('common.showDetails')}
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails(event.id);
        }}
      >
        <Info size={12} />
      </button>
    </div>
  );
}
