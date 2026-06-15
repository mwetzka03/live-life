import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { AppIcon, ColorPicker, IconPicker } from '../common/AppIcon';
import { Modal } from '../common/Modal';
import { parseCalendarSyncSourceId } from '../../lib/caldavAccount';
import { EventChallengeAssign } from './EventChallengeAssign';
import { EventShopAssign } from './EventShopAssign';

interface EventModalProps {
  open: boolean;
  eventId: string | null;
  defaultDate: string;
  onClose: () => void;
}

export function EventModal({ open, eventId, defaultDate, onClose }: EventModalProps) {
  const { app } = useAppState();
  const { runWithLoading } = useLoading();
  const { t } = useLocale();
  const existing = eventId ? app.calendar.getById(eventId) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [icon, setIcon] = useState('calendar');
  const [color, setColor] = useState('#3b82f6');

  const isReadOnly = existing?.readOnly;
  const isAppleReminder = existing?.syncKind === 'reminder' && !!existing?.readOnly;
  const canDelete = !!eventId && !isAppleReminder;
  const isCalDavSynced =
    !!existing?.readOnly &&
    !!existing.syncSourceId &&
    !!parseCalendarSyncSourceId(existing.syncSourceId);

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setDescription(existing?.description ?? '');
    setDate(existing?.date ?? defaultDate);
    setStartTime(existing?.startTime ?? '');
    setEndTime(existing?.endTime ?? '');
    setIcon(existing?.icon ?? 'calendar');
    setColor(existing?.color ?? '#3b82f6');
  }, [open, existing, defaultDate]);

  const save = () => {
    if (isReadOnly) return;
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      icon,
      color,
    };
    if (eventId) app.updateEvent(eventId, payload);
    else app.createEvent(payload);
    onClose();
  };

  const remove = () => {
    if (!eventId) return;
    void runWithLoading(
      () => app.deleteEvent(eventId),
      t('loading.eventDelete'),
    ).then(() => onClose());
  };

  const modalTitle = isReadOnly
    ? t('calendar.eventModal.syncedTitle')
    : eventId
      ? t('calendar.eventModal.editTitle')
      : t('calendar.eventModal.newTitle');

  return (
    <Modal open={open} title={modalTitle} onClose={onClose}>
      <div className="ll-form">
        {isReadOnly && <p className="ll-form-hint">{t('calendar.eventModal.readOnlyHint')}</p>}
        <label>
          {t('common.title')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('calendar.eventModal.titlePlaceholder')}
            disabled={isReadOnly}
          />
        </label>
        <label>
          {t('common.description')}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t('calendar.eventModal.descriptionPlaceholder')}
            disabled={isReadOnly}
          />
        </label>
        <div className="ll-form-row">
          <label>
            {t('calendar.eventModal.date')}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isReadOnly} />
          </label>
          <label>
            {t('calendar.eventModal.from')}
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isReadOnly} />
          </label>
          <label>
            {t('calendar.eventModal.to')}
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={isReadOnly} />
          </label>
        </div>
        {!isReadOnly && (
          <>
            <label>{t('common.icon')}</label>
            <IconPicker value={icon} onChange={setIcon} />
            <label>{t('common.color')}</label>
            <ColorPicker value={color} onChange={setColor} />
          </>
        )}

        {isReadOnly && existing?.linkedChallengeId && (
          <p className="ll-form-hint">{t('calendar.eventModal.challengeCheckoffHint')}</p>
        )}

        {isReadOnly && existing?.isRecurring && (
          <p className="ll-form-hint">{t('calendar.eventModal.deleteSeriesInstanceHint')}</p>
        )}

        {eventId && existing?.syncKind === 'reminder' && !existing.linkedChallengeId && (
          <p className="ll-form-hint ll-recurring-badge">{t('calendar.eventModal.reminderHint')}</p>
        )}

        {eventId && !existing?.linkedShopItemId && existing?.readOnly && (
          <EventChallengeAssign
            eventId={eventId}
            eventDate={date}
            eventTitle={title}
            linkedChallengeId={existing?.linkedChallengeId}
            linkedGroupId={existing?.linkedGroupId}
            isRecurring={existing?.isRecurring}
            recurrence={existing?.recurrence}
            weeklyDays={existing?.weeklyDays}
          />
        )}

        {eventId && !existing?.linkedChallengeId && !existing?.linkedGroupId && (
          <EventShopAssign
            eventId={eventId}
            eventTitle={title}
            linkedShopItemId={existing?.linkedShopItemId}
            isRecurring={existing?.isRecurring}
            isClaimed={eventId ? app.eventRewards.isClaimed(eventId) : false}
          />
        )}

        <div className="ll-form-preview">
          <AppIcon name={icon} size={20} color={color} />
          <span style={{ color }}>{title || t('common.preview')}</span>
        </div>

        <div className="ll-form-actions">
          {canDelete && (
            <button type="button" className="ll-btn danger" onClick={remove}>
              <Trash2 size={16} />{' '}
              {isCalDavSynced ? t('calendar.eventModal.deleteSynced') : t('common.delete')}
            </button>
          )}
          <div className="ll-form-actions-right">
            <button type="button" className="ll-btn ghost" onClick={onClose}>
              {isReadOnly ? t('common.close') : t('common.cancel')}
            </button>
            {!isReadOnly && (
              <button type="button" className="ll-btn primary" onClick={save}>
                {t('common.save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
