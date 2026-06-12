import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import type { CalendarEvent, CalendarViewMode } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import {
  challengeToTimedItem,
  eventToTimedItem,
  sortTimedItems,
  splitTimedItems,
} from '../../lib/calendarDisplay';
import { AppIcon } from '../common/AppIcon';
import { InfoTip } from '../common/InfoTip';
import { ChallengeChip } from './ChallengeChip';
import { CompletedChallengesTodayPanel } from './CompletedChallengesTodayPanel';
import { CalendarEventChip } from './CalendarEventChip';
import { EventModal } from './EventModal';
import { ScheduledRewardsPanel } from './ScheduledRewardsPanel';

interface CalendarPageProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
}

export function CalendarView({
  viewMode,
  onViewModeChange,
  selectedDate,
  onSelectedDateChange,
}: CalendarPageProps) {
  const { app } = useAppState();
  const { t, dict } = useLocale();
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const navigate = (delta: number) => {
    if (viewMode === 'day') onSelectedDateChange(DateUtils.addDays(selectedDate, delta));
    else if (viewMode === 'week')
      onSelectedDateChange(DateUtils.addDays(selectedDate, delta * 7));
    else {
      const d = DateUtils.parseIsoDate(selectedDate);
      d.setMonth(d.getMonth() + delta);
      onSelectedDateChange(DateUtils.toIsoDate(d));
    }
  };

  const title =
    viewMode === 'month'
      ? DateUtils.formatMonthYear(selectedDate)
      : viewMode === 'week'
        ? `${DateUtils.formatGerman(DateUtils.startOfWeek(selectedDate))} – ${DateUtils.formatGerman(DateUtils.endOfWeek(selectedDate))}`
        : DateUtils.formatGerman(selectedDate);

  const openCreate = () => {
    setEditingEventId(null);
    setEventModalOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingEventId(id);
    setEventModalOpen(true);
  };

  const days =
    viewMode === 'day'
      ? [selectedDate]
      : viewMode === 'week'
        ? DateUtils.weekDays(DateUtils.startOfWeek(selectedDate))
        : DateUtils.monthGridDays(selectedDate);

  const getChallengesForDay = (day: string, events: CalendarEvent[]) => {
    const linkedIds = new Set(
      events.filter((e) => e.linkedChallengeId).map((e) => e.linkedChallengeId!),
    );
    return app.challenges.getDueForDate(day).filter((c) => !linkedIds.has(c.id));
  };

  const renderEventChip = (ev: CalendarEvent, showTime: boolean, day: string) => {
    const useRichChip =
      ev.readOnly || ev.linkedShopItemId || ev.linkedChallengeId || ev.syncKind === 'reminder';

    if (useRichChip) {
      return (
        <CalendarEventChip
          key={ev.id}
          event={ev}
          date={day}
          showTime={showTime}
          onOpenDetails={openEdit}
        />
      );
    }

    return (
      <button
        key={ev.id}
        type="button"
        className="ll-chip event"
        style={{ borderColor: ev.color, background: `${ev.color}22` }}
        onClick={(e) => {
          e.stopPropagation();
          openEdit(ev.id);
        }}
      >
        {showTime && ev.startTime && (
          <time className="ll-chip-time">{DateUtils.formatTime(ev.startTime)}</time>
        )}
        <AppIcon name={ev.icon} size={14} color={ev.color} />
        <span>{ev.title}</span>
        {showTime && ev.endTime && (
          <span className="ll-chip-end">– {DateUtils.formatTime(ev.endTime)}</span>
        )}
      </button>
    );
  };

  const renderDaySchedule = (day: string, showTime: boolean) => {
    const events = app.calendar.getForDate(day);
    const dueChallenges = getChallengesForDay(day, events);
    const timedItems = sortTimedItems([
      ...events.map(eventToTimedItem),
      ...dueChallenges.map(challengeToTimedItem),
    ]);
    const { timed, untimed } = splitTimedItems(timedItems);

    return (
      <div className="ll-day-schedule">
        {showTime && timed.length > 0 && (
          <div className="ll-schedule-timed">
            {timed.map((item) => {
              if (item.kind === 'event') {
                const ev = events.find((e) => e.id === item.id)!;
                return renderEventChip(ev, true, day);
              }
              const ch = dueChallenges.find((c) => c.id === item.id)!;
              return <ChallengeChip key={ch.id} challenge={ch} date={day} showTime />;
            })}
          </div>
        )}
        {(!showTime || untimed.length > 0) && (
          <div className="ll-schedule-untimed">
            {!showTime && events.map((ev) => renderEventChip(ev, false, day))}
            {!showTime &&
              dueChallenges.map((ch) => (
                <ChallengeChip key={ch.id} challenge={ch} date={day} compact />
              ))}
            {showTime &&
              untimed.map((item) => {
                if (item.kind === 'event') {
                  const ev = events.find((e) => e.id === item.id)!;
                  return renderEventChip(ev, false, day);
                }
                const ch = dueChallenges.find((c) => c.id === item.id)!;
                return <ChallengeChip key={ch.id} challenge={ch} date={day} />;
              })}
          </div>
        )}
        {showTime && timed.length === 0 && untimed.length === 0 && events.length === 0 && dueChallenges.length === 0 && (
          <p className="ll-day-empty">{t('calendar.emptyDay')}</p>
        )}
      </div>
    );
  };

  const renderWeekDay = (day: string) => {
    const events = app.calendar.getForDate(day);
    const dueChallenges = getChallengesForDay(day, events);

    return (
      <>
        {dueChallenges.length > 0 && (
          <div className="ll-day-challenges-above">
            {dueChallenges.map((ch) => (
              <ChallengeChip key={ch.id} challenge={ch} date={day} showTime compact />
            ))}
          </div>
        )}
        <div className="ll-day-events-below ll-scroll">
          {events.map((ev) => renderEventChip(ev, true, day))}
          {events.length === 0 && dueChallenges.length === 0 && (
            <p className="ll-day-empty">{t('calendar.emptyWeek')}</p>
          )}
        </div>
      </>
    );
  };

  return (
    <section className="ll-page ll-page-fit ll-calendar-page">
      <div className="ll-page-fit-header">
        <div className="ll-page-header">
        <div>
          <h1>
            {t('calendar.title')}
            <InfoTip text={t('help.calendar')} />
          </h1>
          <p>{t('calendar.subtitle')}</p>
        </div>
        <div className="ll-toolbar">
          <div className="ll-segment">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={viewMode === mode ? 'active' : ''}
                onClick={() => onViewModeChange(mode)}
              >
                {mode === 'day'
                  ? t('calendar.viewDay')
                  : mode === 'week'
                    ? t('calendar.viewWeek')
                    : t('calendar.viewMonth')}
              </button>
            ))}
          </div>
          <div className="ll-date-nav">
            <button type="button" className="ll-icon-btn" onClick={() => navigate(-1)}>
              <ChevronLeft size={18} />
            </button>
            <span className="ll-date-title">{title}</span>
            <button type="button" className="ll-icon-btn" onClick={() => navigate(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          <button type="button" className="ll-btn primary" onClick={openCreate}>
            <Plus size={16} /> {t('calendar.addEvent')}
          </button>
        </div>
        </div>
      </div>

      <div className="ll-page-fit-panels">
        <CompletedChallengesTodayPanel />
        <ScheduledRewardsPanel viewMode={viewMode} selectedDate={selectedDate} />
      </div>

      <div className={`ll-calendar ll-calendar-${viewMode}`}>
        {viewMode === 'month' && (
          <div className="ll-calendar-weekdays">
            {dict.labels.monthWeekdays.map((d) => (
              <div key={d} className="ll-weekday-label">
                {d}
              </div>
            ))}
          </div>
        )}

        {viewMode === 'day' && (
          <div className="ll-day-view-header">
            <Clock size={16} />
            <span>{DateUtils.formatGerman(selectedDate)}</span>
          </div>
        )}

        <div className={`ll-calendar-grid ll-grid-${viewMode}`}>
          {days.map((day) => {
            const isToday = day === DateUtils.today();
            const inMonth = viewMode !== 'month' || DateUtils.isSameMonth(day, selectedDate);

            return (
              <article
                key={day}
                className={`ll-day-cell${isToday ? ' today' : ''}${!inMonth ? ' muted' : ''}${viewMode === 'week' ? ' week-column' : ''}`}
                onClick={() => {
                  if (viewMode === 'month') {
                    onSelectedDateChange(day);
                    onViewModeChange('day');
                  }
                }}
              >
                {(viewMode === 'week' || viewMode === 'month') && (
                  <header>
                    <span>{DateUtils.parseIsoDate(day).getDate()}</span>
                    {isToday && <em>{t('calendar.todayLabel')}</em>}
                  </header>
                )}

                {viewMode === 'day' && renderDaySchedule(day, true)}
                {viewMode === 'week' && renderWeekDay(day)}
                {viewMode === 'month' && renderDaySchedule(day, false)}
              </article>
            );
          })}
        </div>
      </div>

      <EventModal
        open={eventModalOpen}
        eventId={editingEventId}
        defaultDate={selectedDate}
        onClose={() => setEventModalOpen(false)}
      />
    </section>
  );
}
