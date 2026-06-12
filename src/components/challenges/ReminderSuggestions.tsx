import { useEffect, useState } from 'react';
import { Bell, Check, Repeat, X } from 'lucide-react';
import type { CalendarEvent, ChallengeCategory, RecurrenceType } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { useReminderSuggestionLimit } from '../../hooks/useReminderSuggestionLimit';
import { AppIcon, ColorPicker, IconPicker } from '../common/AppIcon';
import { Modal } from '../common/Modal';
import { InfoTip } from '../common/InfoTip';

const SUGGESTION_LIMIT = 5;

interface AcceptReminderModalProps {
  open: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
}

export function AcceptReminderModal({ open, event, onClose }: AcceptReminderModalProps) {
  const { app } = useAppState();
  const { runWithLoading } = useLoading();
  const { t, dict, locale } = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';

  const formatDate = (iso: string) =>
    DateUtils.parseIsoDate(iso).toLocaleDateString(dateLocale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('target');
  const [color, setColor] = useState('#8b5cf6');
  const [category, setCategory] = useState<ChallengeCategory>('habit');
  const [coinReward, setCoinReward] = useState(10);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');

  useEffect(() => {
    if (!open || !event) return;
    setTitle(event.title);
    setDescription(event.description ?? '');
    setIcon('target');
    setColor('#8b5cf6');
    setCategory('habit');
    setCoinReward(10);
    setRecurrence(event.recurrence ?? 'none');
    const fallbackDate = event.date ?? DateUtils.today();
    setStartDate(fallbackDate);
    setStartTime(event.startTime ?? '');
    setWeeklyDays(event.weeklyDays ?? [DateUtils.parseIsoDate(fallbackDate).getDay()]);
  }, [open, event]);

  const toggleWeekday = (day: number) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const save = () => {
    if (!event || !title.trim()) return;
    const effectiveStartDate =
      recurrence === 'none' ? (event.date ?? DateUtils.today()) : startDate;
    if (recurrence !== 'none' && !effectiveStartDate) return;
    void runWithLoading(async () => {
      app.acceptReminderAsChallenge(event.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        category,
        coinReward,
        recurrence,
        weeklyDays: recurrence === 'weekly' ? weeklyDays : undefined,
        startDate: effectiveStartDate,
        startTime: startTime.trim() || undefined,
      });
      onClose();
    }, t('loading.reminderAccept'));
  };

  if (!event) return null;

  return (
    <Modal open={open} title={t('challenges.suggestions.acceptModalTitle')} onClose={onClose} wide>
      <div className="ll-form">
        <p className="ll-form-hint">
          <Bell size={14} /> {t('challenges.suggestions.acceptHint')}
          {event.isRecurring && t('challenges.suggestions.seriesLinked')}
        </p>

        <label>
          {t('common.title')}
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          {t('common.description')}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>

        <div className="ll-form-row">
          {recurrence !== 'none' && (
            <>
              <label>
                {t('challenges.suggestions.startDate')}
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>
                {t('challenges.suggestions.timeOptional')}
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </label>
            </>
          )}
        </div>
        {recurrence === 'none' && (event.date || event.startTime) && (
          <p className="ll-form-hint">
            {event.date && t('challenges.suggestions.dueOn', { date: formatDate(event.date) })}
            {event.date && event.startTime && ' · '}
            {event.startTime && DateUtils.formatTime(event.startTime)}
            {t('challenges.suggestions.takenFromReminder')}
          </p>
        )}
        {recurrence !== 'none' && (
          <p className="ll-form-hint">{t('challenges.suggestions.icloudSyncHint')}</p>
        )}

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

        {event.isRecurring && event.recurrence && (
          <p className="ll-form-hint ll-recurring-badge">
            <Repeat size={14} />{' '}
            {t('challenges.suggestions.fromReminder', {
              recurrence: dict.labels.recurrence[event.recurrence],
            })}
          </p>
        )}

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

        <label>{t('common.icon')}</label>
        <IconPicker value={icon} onChange={setIcon} />
        <label>{t('common.color')}</label>
        <ColorPicker value={color} onChange={setColor} />

        <div className="ll-form-actions-right">
          <button type="button" className="ll-btn ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="ll-btn primary"
            onClick={save}
            disabled={!title.trim() || (recurrence !== 'none' && !startDate)}
          >
            {t('challenges.suggestions.createChallenge')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ReminderSuggestionsProps {
  onAccept: (event: CalendarEvent) => void;
}

export function ReminderSuggestions({ onAccept }: ReminderSuggestionsProps) {
  const { app } = useAppState();
  const { t, dict, locale } = useLocale();
  const suggestionLimit = useReminderSuggestionLimit(SUGGESTION_LIMIT);
  const allOpen = app.getReminderSuggestions();
  const suggestions = allOpen.slice(0, suggestionLimit);
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';

  const formatSuggestionMeta = (event: CalendarEvent): string | null => {
    const parts: string[] = [];
    if (event.date) {
      parts.push(
        DateUtils.parseIsoDate(event.date).toLocaleDateString(dateLocale, {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        }),
      );
      if (event.startTime) parts.push(DateUtils.formatTime(event.startTime));
    }
    if (event.recurrence && event.recurrence !== 'none') {
      parts.push(dict.labels.recurrence[event.recurrence]);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  if (suggestions.length === 0) return null;

  return (
    <section className="ll-reminder-suggestions">
      <header>
        <div>
          <Bell size={18} />
          <h2>
            {t('challenges.suggestions.title')}
            <InfoTip text={t('help.challengeSuggestions')} />
          </h2>
        </div>
        <span>
          {t('challenges.suggestions.openCount', {
            shown: suggestions.length,
            total: allOpen.length,
          })}
        </span>
      </header>
      <ul className="ll-reminder-suggestion-list">
        {suggestions.map((event) => {
          const line = formatSuggestionMeta(event);
          return (
            <li
              key={event.id}
              className={`ll-reminder-suggestion-item${line ? ' has-meta' : ''}`}
            >
              <div className="ll-reminder-suggestion-icon">
                <AppIcon name="bell" size={16} color={event.color} />
              </div>
              <div className="ll-reminder-suggestion-content">
                <strong>{event.title}</strong>
                {line && <span>{line}</span>}
                {event.description && <p className="ll-reminder-suggestion-note">{event.description}</p>}
              </div>
              <div className="ll-reminder-suggestion-actions">
                <button
                  type="button"
                  className="ll-btn small ghost"
                  title={t('challenges.suggestions.dismiss')}
                  onClick={() => app.dismissReminderSuggestion(event.id)}
                >
                  <X size={14} /> {t('challenges.suggestions.dismiss')}
                </button>
                <button
                  type="button"
                  className="ll-btn small primary"
                  title={t('challenges.suggestions.accept')}
                  onClick={() => onAccept(event)}
                >
                  <Check size={14} /> {t('challenges.suggestions.accept')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
