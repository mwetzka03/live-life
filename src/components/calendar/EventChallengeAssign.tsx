import { useState } from 'react';
import { Link2, Plus, Repeat, Unlink, Users } from 'lucide-react';
import type { ChallengeCategory, RecurrenceType } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { AppIcon } from '../common/AppIcon';
import { InfoPanel } from '../common/InfoPanel';

interface EventChallengeAssignProps {
  eventId: string;
  eventDate: string;
  eventTitle: string;
  linkedChallengeId?: string;
  linkedGroupId?: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
  weeklyDays?: number[];
}

export function EventChallengeAssign({
  eventId,
  eventDate,
  eventTitle,
  linkedChallengeId,
  linkedGroupId,
  isRecurring,
  recurrence,
  weeklyDays,
}: EventChallengeAssignProps) {
  const { app } = useAppState();
  const { runWithLoading } = useLoading();
  const { t, dict } = useLocale();
  const [selectedId, setSelectedId] = useState('');
  const [newTitle, setNewTitle] = useState(eventTitle);
  const [newCoins, setNewCoins] = useState(10);
  const [newCategory, setNewCategory] = useState<ChallengeCategory>('todo');
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceType>(recurrence ?? 'none');
  const [newWeeklyDays, setNewWeeklyDays] = useState<number[]>(
    weeklyDays ?? [DateUtils.parseIsoDate(eventDate).getDay()],
  );
  const [showCreate, setShowCreate] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState('');

  const linked = linkedChallengeId ? app.challenges.getById(linkedChallengeId) : undefined;
  const linkedGroup = linkedGroupId ? app.challengeGroups.getById(linkedGroupId) : undefined;
  const linkedCompleted = linked ? app.challenges.isCompletedOn(linked.id, eventDate) : false;

  const assignableGroups = app.challengeGroups.getAll();

  const assignable = app.challenges
    .getAll()
    .filter((c) => !app.challenges.isCompletedOn(c.id, eventDate));

  const toggleWeekday = (day: number) => {
    setNewWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const assignExisting = () => {
    if (!selectedId) return;
    void runWithLoading(async () => {
      app.assignEventToChallenge(eventId, selectedId);
      setSelectedId('');
    }, t('loading.challengeAssign'));
  };

  const createAndAssign = () => {
    if (!newTitle.trim()) return;
    void runWithLoading(async () => {
      app.createChallengeFromEvent(eventId, {
        title: newTitle.trim(),
        coinReward: newCoins,
        category: newCategory,
        recurrence: newRecurrence,
        weeklyDays: newRecurrence === 'weekly' ? newWeeklyDays : undefined,
      });
      setShowCreate(false);
    }, t('loading.challengeCreate'));
  };

  const unlink = () => {
    app.unlinkEventFromChallenge(eventId);
  };

  const unlinkGroup = () => {
    app.unlinkEventFromGroup(eventId);
  };

  const assignGroup = () => {
    if (!selectedGroupId) return;
    void runWithLoading(async () => {
      app.assignEventToGroup(eventId, selectedGroupId);
      setSelectedGroupId('');
    }, t('loading.challengeAssign'));
  };

  return (
    <div className="ll-event-challenge-assign">
      <h3>
        <Link2 size={16} /> {t('calendar.challengeAssign.title')}
      </h3>
      {isRecurring && (
        <p className="ll-form-hint ll-recurring-badge">
          <Repeat size={14} /> {t('calendar.challengeAssign.recurring')}
          {recurrence && recurrence !== 'none' && ` · ${dict.labels.recurrence[recurrence]}`}
        </p>
      )}
      <InfoPanel
        items={[
          t('calendar.challengeAssign.hint') +
            (isRecurring ? t('calendar.challengeAssign.recurringHint') : ''),
        ]}
      />

      {linkedGroup && (
        <div className="ll-linked-challenge">
          <Users size={18} aria-hidden />
          <div>
            <strong>{linkedGroup.title}</strong>
            <span className="ll-form-hint">{t('calendar.challengeAssign.groupLinked')}</span>
          </div>
          <button type="button" className="ll-btn small ghost" onClick={unlinkGroup}>
            <Unlink size={14} /> {t('calendar.challengeAssign.remove')}
          </button>
        </div>
      )}

      {linked && (
        <div className="ll-linked-challenge">
          <AppIcon name={linked.icon} size={18} color={linked.color} />
          <div>
            <strong style={{ color: linked.color }}>{linked.title}</strong>
            {linkedCompleted && (
              <span className="ll-form-hint">{t('calendar.challengeAssign.doneOnDay')}</span>
            )}
            {!linkedCompleted && (
              <span className="ll-form-hint">{t('calendar.challengeAssign.tapToComplete')}</span>
            )}
          </div>
          {!linkedCompleted && (
            <button type="button" className="ll-btn small ghost" onClick={unlink}>
              <Unlink size={14} /> {t('calendar.challengeAssign.remove')}
            </button>
          )}
        </div>
      )}

      {!linked && !linkedGroup && (
        <>
          {assignableGroups.length > 0 && (
            <div className="ll-event-assign-row">
              <label className="ll-form-grow">
                {t('calendar.challengeAssign.group')}
                <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {assignableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="ll-btn small primary ll-event-assign-btn"
                disabled={!selectedGroupId}
                onClick={assignGroup}
              >
                {t('calendar.challengeAssign.assignGroup')}
              </button>
            </div>
          )}

          {assignable.length > 0 && (
            <div className="ll-event-assign-row">
              <label className="ll-form-grow">
                {t('calendar.challengeAssign.existing')}
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {assignable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.recurrence !== 'none' ? ` (${dict.labels.recurrence[c.recurrence]})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="ll-btn small primary ll-event-assign-btn"
                disabled={!selectedId}
                onClick={assignExisting}
              >
                {t('calendar.challengeAssign.assign')}
              </button>
            </div>
          )}

          {assignable.length === 0 && !showCreate && (
            <p className="ll-form-hint">{t('calendar.challengeAssign.noOpen')}</p>
          )}

          {!showCreate ? (
            <button type="button" className="ll-btn small ll-event-create-toggle" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> {t('calendar.challengeAssign.createNew')}
            </button>
          ) : (
            <div className="ll-event-challenge-create">
              <label>
                {t('common.title')}
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </label>
              <div className="ll-form-row">
                <label>
                  {t('calendar.challengeAssign.category')}
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ChallengeCategory)}
                  >
                    {Object.entries(dict.labels.categories).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t('common.coins')}
                  <input
                    type="number"
                    min={1}
                    value={newCoins}
                    onChange={(e) => setNewCoins(Number(e.target.value))}
                  />
                </label>
                <label>
                  {t('calendar.challengeAssign.recurrence')}
                  <select
                    value={newRecurrence}
                    onChange={(e) => setNewRecurrence(e.target.value as RecurrenceType)}
                  >
                    {Object.entries(dict.labels.recurrence).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {newRecurrence === 'weekly' && (
                <div className="ll-weekday-picker">
                  {dict.labels.weekdays.map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      className={newWeeklyDays.includes(idx) ? 'active' : ''}
                      onClick={() => toggleWeekday(idx)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <div className="ll-form-actions-right">
                <button type="button" className="ll-btn small ghost" onClick={() => setShowCreate(false)}>
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="ll-btn small primary"
                  disabled={!newTitle.trim()}
                  onClick={createAndAssign}
                >
                  {t('calendar.challengeAssign.createAssign')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
