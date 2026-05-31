import { useState } from 'react';
import type { CalendarViewMode } from '../domain/models/AppData';
import { DateUtils } from '../domain/services/DateUtils';
import { CalendarView } from '../components/calendar/CalendarView';

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(DateUtils.today());

  return (
    <CalendarView
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      selectedDate={selectedDate}
      onSelectedDateChange={setSelectedDate}
    />
  );
}
