import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { CalendarEvent, Challenge, ChallengeGroup } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { useAppState } from '../../hooks/useAppState';
import { useLocale } from '../../i18n/LocaleProvider';
import { Modal } from '../../components/common/Modal';

interface PendingComplete {
  challengeId: string;
  scheduledDate: string;
  linkedEventId?: string;
}

const ChallengeCompleteContext = createContext<{
  requestComplete: (challengeId: string, contextDate?: string, linkedEventId?: string) => void;
} | null>(null);

function scheduledDateFor(
  challenge: Challenge,
  event?: CalendarEvent,
  group?: ChallengeGroup,
): string | undefined {
  if (
    challenge.recurrence === 'daily' ||
    challenge.recurrence === 'weekly' ||
    challenge.recurrence === 'monthly'
  ) {
    return event?.date;
  }

  return challenge.startDate ?? event?.date ?? group?.startDate;
}

function defaultCompletionDate(
  contextDate: string | undefined,
  event: CalendarEvent | undefined,
  scheduled: string | undefined,
): string {
  const realToday = DateUtils.today();
  if (scheduled && scheduled === realToday) return realToday;

  const cellDate = contextDate ?? realToday;
  if (event) return event.date ?? cellDate;
  return cellDate;
}

export function useChallengeComplete() {
  const ctx = useContext(ChallengeCompleteContext);
  if (!ctx) {
    throw new Error('useChallengeComplete must be used within ChallengeCompleteProvider');
  }
  return ctx;
}

export function ChallengeCompleteProvider({ children }: { children: ReactNode }) {
  const { app } = useAppState();
  const { t } = useLocale();
  const [pending, setPending] = useState<PendingComplete | null>(null);

  const finish = useCallback(
    (challengeId: string, date: string, linkedEventId?: string) => {
      if (linkedEventId) {
        void app.completeLinkedEventChallenge(linkedEventId, date);
      } else {
        void app.completeChallenge(challengeId, date);
      }
    },
    [app],
  );

  const requestComplete = useCallback(
    (challengeId: string, contextDate?: string, linkedEventId?: string) => {
      const challenge = app.challenges.getById(challengeId);
      if (!challenge) return;

      const event = linkedEventId ? app.calendar.getById(linkedEventId) : undefined;
      const group = challenge.groupId ? app.challengeGroups.getById(challenge.groupId) : undefined;
      const realToday = DateUtils.today();
      const scheduled = scheduledDateFor(challenge, event, group);

      const needsPrompt = !!scheduled && scheduled !== realToday;

      if (needsPrompt) {
        setPending({ challengeId, scheduledDate: scheduled!, linkedEventId });
        return;
      }

      finish(
        challengeId,
        defaultCompletionDate(contextDate, event, scheduled),
        linkedEventId,
      );
    },
    [app, finish],
  );

  const challenge = pending ? app.challenges.getById(pending.challengeId) : undefined;

  return (
    <ChallengeCompleteContext.Provider value={{ requestComplete }}>
      {children}
      {createPortal(
        <Modal
          open={!!pending}
          title={t('challenges.completeDate.title')}
          onClose={() => setPending(null)}
        >
          <div className="ll-form">
            <p className="ll-form-hint">
              {t('challenges.completeDate.hint', {
                title: challenge?.title ?? '',
                date: pending ? DateUtils.formatGerman(pending.scheduledDate) : '',
              })}
            </p>
            <div className="ll-form-actions-right">
              <button
                type="button"
                className="ll-btn ghost"
                onClick={() => {
                  if (!pending) return;
                  finish(pending.challengeId, DateUtils.today(), pending.linkedEventId);
                  setPending(null);
                }}
              >
                {t('challenges.completeDate.today')}
              </button>
              <button
                type="button"
                className="ll-btn primary"
                onClick={() => {
                  if (!pending) return;
                  finish(pending.challengeId, pending.scheduledDate, pending.linkedEventId);
                  setPending(null);
                }}
              >
                {t('challenges.completeDate.scheduled', {
                  date: pending ? DateUtils.formatGerman(pending.scheduledDate) : '',
                })}
              </button>
            </div>
          </div>
        </Modal>,
        document.body,
      )}
    </ChallengeCompleteContext.Provider>
  );
}
