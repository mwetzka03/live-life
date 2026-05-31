import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Edit3, Flame, Plus, Trash2, Undo2 } from 'lucide-react';
import type { CalendarEvent, Challenge, ChallengeCategory, RecurrenceType } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { isTauriApp } from '../../domain/services/CalDavApi';
import { StreakMultiplier } from '../../domain/services/StreakMultiplier';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { getStoredAppleReminderListOptions } from '../../lib/appleReminderListOptions';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { AppIcon, ColorPicker, IconPicker } from '../common/AppIcon';
import { Modal } from '../common/Modal';
import { AcceptReminderModal, ReminderSuggestions } from './ReminderSuggestions';
import { PageHeader } from '../common/InfoTip';

type ChallengeTab = 'active' | 'completed';

function isCompletedOneTime(challenge: Challenge, hasAnyCompletion: (id: string) => boolean): boolean {
  return challenge.recurrence === 'none' && hasAnyCompletion(challenge.id);
}

interface ChallengeCardProps {
  challenge: Challenge;
  completed?: boolean;
  onEdit: (id: string) => void;
}

function ChallengeCard({ challenge, completed = false, onEdit }: ChallengeCardProps) {
  const { app } = useAppState();
  const { runWithLoading } = useLoading();
  const { t, dict } = useLocale();
  const streak = app.challenges.getStreak(challenge.id);
  const multiplier = StreakMultiplier.fromStreak(streak + 1);
  const projected = app.challenges.getProjectedReward(challenge, DateUtils.today());
  const totalDone = app.challenges.getCompletionsForChallenge(challenge.id).length;
  const completion = app.challenges.getCompletionsForChallenge(challenge.id).at(-1);

  const handleUncomplete = () => {
    if (!completion) return;
    void runWithLoading(
      () => app.uncompleteChallenge(challenge.id, completion.date),
      t('loading.challengeReset'),
    );
  };

  const handleComplete = () => {
    void runWithLoading(
      () => app.completeChallenge(challenge.id, DateUtils.today()),
      t('loading.challengeComplete'),
    );
  };

  return (
    <article
      className={`ll-card${completed ? ' ll-card-completed' : ''}`}
      style={{ borderTopColor: challenge.color }}
    >
      <div className="ll-card-icon" style={{ background: `${challenge.color}22`, color: challenge.color }}>
        <AppIcon name={challenge.icon} size={22} color={challenge.color} />
      </div>
      <div className="ll-card-body">
        <h3>{challenge.title}</h3>
        {challenge.description && <p>{challenge.description}</p>}
        <div className="ll-card-meta">
          <span>{dict.labels.categories[challenge.category]}</span>
          <span>{dict.labels.recurrence[challenge.recurrence]}</span>
          <span className="coin">
            {t('challenges.coinsReward', { amount: challenge.coinReward })}
            {!completed && multiplier > 1 && ` → ${projected.total} (${StreakMultiplier.format(multiplier)})`}
          </span>
        </div>
        <div className="ll-card-stats">
          {completed && completion ? (
            <>
              <span>
                <CheckCircle2 size={14} />{' '}
                {t('challenges.doneOn', { date: DateUtils.formatGerman(completion.date) })}
              </span>
              <span className="coin">
                {t('challenges.coinsEarned', { amount: completion.coinsEarned })}
              </span>
            </>
          ) : (
            <>
              <span>
                <Flame size={14} /> {t('challenges.streak', { count: streak })}
                {multiplier > 1 && ` · ${StreakMultiplier.format(multiplier)}`}
              </span>
              <span>
                <CheckCircle2 size={14} /> {t('challenges.timesDone', { count: totalDone })}
              </span>
              {(challenge.startTime || challenge.endTime) && (
                <span>
                  {DateUtils.formatTime(challenge.startTime)}
                  {challenge.endTime ? ` – ${DateUtils.formatTime(challenge.endTime)}` : ''}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="ll-card-actions">
        {completed ? (
          <button
            type="button"
            className="ll-icon-btn"
            onClick={handleUncomplete}
            aria-label={t('challenges.reset')}
            title={t('challenges.reset')}
          >
            <Undo2 size={16} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className="ll-icon-btn primary"
            disabled={
              (challenge.recurrence === 'none' && app.challenges.hasAnyCompletion(challenge.id)) ||
              (challenge.recurrence !== 'irregular' &&
                challenge.recurrence !== 'none' &&
                app.challenges.isCompletedOn(challenge.id, DateUtils.today()))
            }
            onClick={handleComplete}
            aria-label={t('challenges.completeToday')}
            title={t('challenges.completeToday')}
          >
            <Check size={16} aria-hidden />
          </button>
        )}
        <button type="button" className="ll-icon-btn" onClick={() => onEdit(challenge.id)} aria-label={t('common.edit')}>
          <Edit3 size={16} />
        </button>
        <button
          type="button"
          className="ll-icon-btn danger"
          aria-label={t('common.delete')}
          onClick={() => {
            void runWithLoading(
              () => app.deleteChallenge(challenge.id),
              t('loading.challengeDelete'),
            );
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

export function ChallengePanel() {
  const { app } = useAppState();
  const { t } = useLocale();
  const challenges = app.challenges.getAll();
  const [tab, setTab] = useState<ChallengeTab>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [acceptReminder, setAcceptReminder] = useState<CalendarEvent | null>(null);

  const { activeChallenges, completedOneTime } = useMemo(() => {
    const active: Challenge[] = [];
    const completed: Challenge[] = [];
    for (const ch of challenges) {
      if (isCompletedOneTime(ch, app.challenges.hasAnyCompletion.bind(app.challenges))) completed.push(ch);
      else active.push(ch);
    }
    return { activeChallenges: active, completedOneTime: completed };
  }, [challenges, app.challenges]);

  const visibleChallenges = tab === 'active' ? activeChallenges : completedOneTime;

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  return (
    <section className="ll-page">
      <PageHeader
        title={t('challenges.title')}
        subtitle={t('challenges.subtitle')}
        info={t('help.challenges')}
        actions={
          <button type="button" className="ll-btn primary" onClick={openCreate}>
            <Plus size={16} /> {t('challenges.add')}
          </button>
        }
      />

      <ReminderSuggestions onAccept={setAcceptReminder} />

      <div className="ll-challenge-tabs">
        <div className="ll-segment">
          <button
            type="button"
            className={tab === 'active' ? 'active' : ''}
            onClick={() => setTab('active')}
          >
            {t('challenges.tabActive')}
          </button>
          <button
            type="button"
            className={tab === 'completed' ? 'active' : ''}
            onClick={() => setTab('completed')}
          >
            {t('challenges.tabCompleted')}
            {completedOneTime.length > 0 && (
              <span className="ll-tab-badge">{completedOneTime.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="ll-card-grid">
        {tab === 'completed' && completedOneTime.length === 0 && (
          <div className="ll-empty">
            <CheckCircle2 size={32} />
            <p>{t('challenges.emptyCompleted')}</p>
          </div>
        )}
        {tab === 'active' && activeChallenges.length === 0 && (
          <div className="ll-empty">
            <Flame size={32} />
            <p>{t('challenges.emptyActive')}</p>
          </div>
        )}
        {visibleChallenges.map((ch) => (
          <ChallengeCard
            key={ch.id}
            challenge={ch}
            completed={tab === 'completed'}
            onEdit={openEdit}
          />
        ))}
      </div>

      <ChallengeModal open={modalOpen} challengeId={editingId} onClose={() => setModalOpen(false)} />
      <AcceptReminderModal
        open={!!acceptReminder}
        event={acceptReminder}
        onClose={() => setAcceptReminder(null)}
      />
    </section>
  );
}

interface ChallengeModalProps {
  open: boolean;
  challengeId: string | null;
  onClose: () => void;
}

function ChallengeModal({ open, challengeId, onClose }: ChallengeModalProps) {
  const { app } = useAppState();
  const { runWithLoading } = useLoading();
  const { t, dict } = useLocale();
  const existing = challengeId ? app.challenges.getById(challengeId) : undefined;
  const hasAppleAccounts = app.appleRemindersAccounts.getAll().some((a) => a.enabled);

  const icloudListOptions = useMemo(() => {
    if (!open || !isTauriApp() || !hasAppleAccounts) return [];
    return getStoredAppleReminderListOptions(app.appleRemindersAccounts.getAll());
  }, [open, hasAppleAccounts, app]);

  const [saveError, setSaveError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('target');
  const [color, setColor] = useState('#8b5cf6');
  const [category, setCategory] = useState<ChallengeCategory>('habit');
  const [coinReward, setCoinReward] = useState(10);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('daily');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(DateUtils.today());
  const [endDate, setEndDate] = useState('');
  const [streakTarget, setStreakTarget] = useState<number | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [icloudListKey, setIcloudListKey] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setDescription(existing?.description ?? '');
    setIcon(existing?.icon ?? 'target');
    setColor(existing?.color ?? '#8b5cf6');
    setCategory(existing?.category ?? 'habit');
    setCoinReward(existing?.coinReward ?? 10);
    setRecurrence(existing?.recurrence ?? 'daily');
    setWeeklyDays(existing?.weeklyDays ?? [1, 2, 3, 4, 5]);
    setStartDate(existing?.startDate ?? DateUtils.today());
    setEndDate(existing?.endDate ?? '');
    setStreakTarget(existing?.streakTarget ?? '');
    setStartTime(existing?.startTime ?? '');
    setEndTime(existing?.icloudReminderHref ? '' : (existing?.endTime ?? ''));
    setIcloudListKey(existing?.icloudReminderSourceId ?? '');
    setSaveError('');
  }, [open, existing]);

  useEffect(() => {
    if (recurrence !== 'none') {
      setIcloudListKey('');
    }
  }, [recurrence]);

  useEffect(() => {
    if (icloudListKey) {
      setEndTime('');
    }
  }, [icloudListKey]);

  const icloudLinked = !!existing?.icloudReminderHref || !!icloudListKey;

  const toggleWeekday = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const save = () => {
    if (!title.trim()) return;
    const effectiveStartDate = startDate;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      category,
      coinReward: Math.max(1, coinReward),
      recurrence,
      weeklyDays: recurrence === 'weekly' ? weeklyDays : undefined,
      startDate: effectiveStartDate,
      endDate: recurrence === 'none' || recurrence === 'irregular' ? undefined : endDate || undefined,
      streakTarget:
        recurrence === 'none' || recurrence === 'irregular'
          ? undefined
          : streakTarget === ''
            ? undefined
            : Number(streakTarget),
      startTime: startTime || undefined,
      endTime: icloudLinked ? undefined : endTime || undefined,
    };

    void runWithLoading(async () => {
      setSaveError('');
      let savedId = challengeId;
      if (challengeId) {
        app.updateChallenge(challengeId, payload);
      } else {
        const created = app.createChallenge(payload);
        savedId = created.id;
      }

      const shouldCreateICloud =
        isTauriApp() &&
        recurrence === 'none' &&
        icloudListKey &&
        (!existing?.icloudReminderHref || icloudListKey !== existing?.icloudReminderSourceId);

      if (shouldCreateICloud && savedId) {
        await app.createChallengeICloudReminder(savedId, icloudListKey);
      }

      onClose();
    }, t('loading.challengeSave')).catch((error) => {
      setSaveError(error instanceof Error ? error.message : t('common.saveFailed'));
    });
  };

  const remove = () => {
    if (!challengeId) return;
    void runWithLoading(async () => {
      await app.deleteChallenge(challengeId);
      onClose();
    }, t('loading.challengeDelete'));
  };

  return (
    <Modal
      open={open}
      title={challengeId ? t('challenges.modal.editTitle') : t('challenges.modal.newTitle')}
      onClose={onClose}
      wide
    >
      <div className="ll-form">
        <label>
          {t('common.title')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('challenges.modal.titlePlaceholder')}
          />
        </label>
        <label>
          {t('common.description')}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <div className="ll-form-row">
          <label>
            {t('challenges.modal.category')}
            <select value={category} onChange={(e) => setCategory(e.target.value as ChallengeCategory)}>
              {Object.entries(dict.labels.categories).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('challenges.modal.coinsPerCompletion')}
            <input
              type="number"
              min={1}
              value={coinReward}
              onChange={(e) => setCoinReward(Number(e.target.value))}
            />
          </label>
          <label>
            {t('challenges.modal.recurrence')}
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}>
              {Object.entries(dict.labels.recurrence).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>

        {recurrence === 'weekly' && (
          <div className="ll-weekday-picker">
            {dict.labels.weekdays.map((label, idx) => (
              <button
                key={label}
                type="button"
                className={weeklyDays.includes(idx) ? 'active' : ''}
                onClick={() => toggleWeekday(idx)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {recurrence === 'none' && (
          <div className="ll-form-row">
            <label>
              {t('challenges.modal.date')}
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
          </div>
        )}

        {recurrence !== 'none' && recurrence !== 'irregular' && (
          <div className="ll-form-row">
            <label>
              {t('challenges.modal.start')}
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              {t('challenges.modal.endOptional')}
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <label>
              {t('challenges.modal.streakTarget')}
              <input
                type="number"
                min={1}
                value={streakTarget}
                onChange={(e) => setStreakTarget(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t('challenges.modal.streakPlaceholder')}
              />
            </label>
          </div>
        )}

        {recurrence === 'irregular' && (
          <p className="ll-form-hint">{t('challenges.modal.irregularHint')}</p>
        )}

        <div className="ll-form-row">
          <label>
            {t('challenges.modal.timeFrom')}
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          {!icloudLinked && (
            <label>
              {t('challenges.modal.timeTo')}
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </label>
          )}
        </div>

        {isTauriApp() && hasAppleAccounts && recurrence === 'none' && (
          <label>
            {t('challenges.modal.appleReminder')}
            <select
              value={icloudListKey}
              onChange={(e) => setIcloudListKey(e.target.value)}
              disabled={!!existing?.icloudReminderHref}
            >
              <option value="">{t('common.noneOption')}</option>
              {icloudListOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {isTauriApp() && hasAppleAccounts && recurrence !== 'none' && (
          <p className="ll-form-hint">{t('challenges.modal.icloudOnceOnly')}</p>
        )}
        {icloudLinked && (
          <p className="ll-form-hint">{t('challenges.modal.icloudNoEndTime')}</p>
        )}
        {icloudLinked && (
          <p className="ll-form-hint">{t('challenges.modal.icloudDelay')}</p>
        )}
        {icloudLinked && (
          <p className="ll-form-hint">{t('challenges.modal.icloudDeleteLinked')}</p>
        )}
        {saveError && <p className="ll-form-hint error-text">{saveError}</p>}
        {isTauriApp() && hasAppleAccounts && icloudListOptions.length === 0 && (
          <p className="ll-form-hint">{t('challenges.modal.noListsCache')}</p>
        )}
        {isTauriApp() && !hasAppleAccounts && (
          <p className="ll-form-hint">{t('challenges.modal.needAppleAccount')}</p>
        )}
        {existing?.icloudReminderHref && (
          <p className="ll-form-hint">{t('challenges.modal.icloudLinked')}</p>
        )}

        <p className="ll-form-hint">{t('challenges.modal.streakBonus')}</p>

        <label>{t('common.icon')}</label>
        <IconPicker value={icon} onChange={setIcon} />
        <label>{t('common.color')}</label>
        <ColorPicker value={color} onChange={setColor} />

        <div className="ll-form-actions">
          {challengeId && (
            <button type="button" className="ll-btn danger" onClick={remove}>
              <Trash2 size={16} /> {t('common.delete')}
            </button>
          )}
          <div className="ll-form-actions-right">
            <button type="button" className="ll-btn ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="button" className="ll-btn primary" onClick={save}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
