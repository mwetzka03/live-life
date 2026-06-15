import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { ChallengeCategory, RecurrenceType } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { isTauriApp } from '../../domain/services/CalDavApi';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { getStoredAppleReminderListOptions } from '../../lib/appleReminderListOptions';
import { ColorPicker, IconPicker } from '../common/AppIcon';
import { InfoPanel } from '../common/InfoPanel';
import { Modal } from '../common/Modal';

export interface ChallengeModalProps {
  open: boolean;
  challengeId: string | null;
  onClose: () => void;
  /** Nur einmalige Challenges (Gruppen-Einträge). */
  oneTimeOnly?: boolean;
  /** Gruppen-Auswahl ausblenden. */
  hideGroupPicker?: boolean;
  /** Bestehende Gruppe beim Speichern setzen. */
  presetGroupId?: string;
  /** Nach dem Anlegen (nicht beim Bearbeiten). */
  onCreated?: (challengeId: string) => void;
}

export function ChallengeModal({
  open,
  challengeId,
  onClose,
  oneTimeOnly = false,
  hideGroupPicker = false,
  presetGroupId,
  onCreated,
}: ChallengeModalProps) {
  const { app } = useAppState();
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
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [streakTarget, setStreakTarget] = useState<number | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [icloudListKey, setIcloudListKey] = useState('');
  const [groupId, setGroupId] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setDescription(existing?.description ?? '');
    setIcon(existing?.icon ?? 'target');
    setColor(existing?.color ?? '#8b5cf6');
    setCategory(existing?.category ?? (oneTimeOnly ? 'todo' : 'habit'));
    setCoinReward(existing?.coinReward ?? 10);
    setRecurrence(existing?.recurrence ?? 'none');
    setWeeklyDays(existing?.weeklyDays ?? [1, 2, 3, 4, 5]);
    setStartDate(existing?.startDate ?? '');
    setEndDate(existing?.endDate ?? '');
    setStreakTarget(existing?.streakTarget ?? '');
    setStartTime(existing?.startTime ?? '');
    setEndTime(existing?.icloudReminderHref ? '' : (existing?.endTime ?? ''));
    setIcloudListKey(existing?.icloudReminderSourceId ?? '');
    setGroupId(existing?.groupId ?? presetGroupId ?? '');
    setSaveError('');
  }, [open, existing, oneTimeOnly, presetGroupId]);

  const effectiveRecurrence = oneTimeOnly ? 'none' : recurrence;
  const icloudLinked = !!existing?.icloudReminderHref || !!icloudListKey;

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

  useEffect(() => {
    if (effectiveRecurrence === 'none' && !startDate) {
      setStartTime('');
      setEndTime('');
    }
  }, [effectiveRecurrence, startDate]);

  useEffect(() => {
    if (effectiveRecurrence !== 'none' && effectiveRecurrence !== 'irregular' && !startDate) {
      setStartDate(DateUtils.today());
    }
  }, [effectiveRecurrence, startDate]);

  const toggleWeekday = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const save = () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      category,
      coinReward: Math.max(1, coinReward),
      recurrence: effectiveRecurrence,
      weeklyDays: effectiveRecurrence === 'weekly' ? weeklyDays : undefined,
      startDate:
        effectiveRecurrence === 'none'
          ? startDate || undefined
          : startDate || DateUtils.today(),
      endDate:
        effectiveRecurrence === 'none' || effectiveRecurrence === 'irregular'
          ? undefined
          : endDate || undefined,
      streakTarget:
        effectiveRecurrence === 'none' || effectiveRecurrence === 'irregular'
          ? undefined
          : streakTarget === ''
            ? undefined
            : Number(streakTarget),
      startTime:
        effectiveRecurrence === 'none' && !startDate ? undefined : startTime || undefined,
      endTime:
        icloudLinked || (effectiveRecurrence === 'none' && !startDate)
          ? undefined
          : endTime || undefined,
    };

    setSaveError('');
    try {
      let savedId = challengeId;
      const linkGroupId = hideGroupPicker ? presetGroupId : groupId || undefined;

      if (challengeId) {
        app.updateChallenge(challengeId, payload);
        if (!hideGroupPicker) {
          app.setChallengeGroupLink(challengeId, groupId || undefined);
        } else if (presetGroupId) {
          app.setChallengeGroupLink(challengeId, presetGroupId);
        }
      } else {
        const created = app.createChallenge(payload);
        savedId = created.id;
        if (linkGroupId) {
          app.setChallengeGroupLink(created.id, linkGroupId);
        }
        if (savedId) {
          onCreated?.(savedId);
        }
      }

      const shouldCreateICloud =
        isTauriApp() &&
        effectiveRecurrence === 'none' &&
        icloudListKey &&
        (!existing?.icloudReminderHref || icloudListKey !== existing?.icloudReminderSourceId);

      if (shouldCreateICloud && savedId) {
        app.queueCreateChallengeICloudReminder(savedId, icloudListKey);
      }

      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('common.saveFailed'));
    }
  };

  const remove = () => {
    if (!challengeId) return;
    void app.deleteChallenge(challengeId);
    onClose();
  };

  const modalTitle = challengeId
    ? t('challenges.modal.editTitle')
    : oneTimeOnly
      ? t('challenges.groups.createNew')
      : t('challenges.modal.newTitle');

  return (
    <Modal open={open} title={modalTitle} onClose={onClose} wide>
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
          {!oneTimeOnly && (
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
          )}
        </div>

        {effectiveRecurrence === 'weekly' && (
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

        {effectiveRecurrence === 'none' && (
          <div className="ll-form-row">
            <label>
              {t('challenges.modal.date')} ({t('common.optional')})
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
          </div>
        )}

        {effectiveRecurrence !== 'none' && effectiveRecurrence !== 'irregular' && (
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

        {effectiveRecurrence === 'irregular' && (
          <p className="ll-form-hint">{t('challenges.modal.irregularHint')}</p>
        )}

        {(effectiveRecurrence !== 'none' || startDate) && (
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
        )}

        {isTauriApp() && hasAppleAccounts && effectiveRecurrence === 'none' && (
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
        {isTauriApp() && hasAppleAccounts && effectiveRecurrence !== 'none' && !oneTimeOnly && (
          <p className="ll-form-hint">{t('challenges.modal.icloudOnceOnly')}</p>
        )}
        {icloudLinked && (
          <InfoPanel
            items={[
              t('challenges.modal.icloudNoEndTime'),
              t('challenges.modal.icloudDelay'),
              t('challenges.modal.icloudDeleteLinked'),
              existing?.icloudReminderHref ? t('challenges.modal.icloudLinked') : '',
              effectiveRecurrence !== 'none' && effectiveRecurrence !== 'irregular'
                ? t('challenges.modal.streakBonus')
                : '',
            ]}
          />
        )}

        {saveError && <p className="ll-form-hint error-text">{saveError}</p>}
        {isTauriApp() && hasAppleAccounts && icloudListOptions.length === 0 && (
          <p className="ll-form-hint">{t('challenges.modal.noListsCache')}</p>
        )}
        {isTauriApp() && !hasAppleAccounts && (
          <p className="ll-form-hint">{t('challenges.modal.needAppleAccount')}</p>
        )}

        {!hideGroupPicker &&
          effectiveRecurrence === 'none' &&
          app.challengeGroups.getAll().length > 0 && (
            <label>
              {t('challenges.groups.linkToGroup')}
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">{t('common.noneOption')}</option>
                {app.challengeGroups.getAll().map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
          )}

        {!icloudLinked && effectiveRecurrence !== 'none' && effectiveRecurrence !== 'irregular' && (
          <p className="ll-form-hint">{t('challenges.modal.streakBonus')}</p>
        )}

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
