import { useEffect, useReducer, useState } from 'react';
import { getAppState } from '../domain/services/AppStateService';

export function useAppState() {
  const app = getAppState();
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => app.subscribe(() => rerender()), [app]);

  return {
    app,
    snapshot: app.getSnapshot(),
    balance: app.getBalance(),
  };
}

export function useSelectedDate(initial?: string) {
  const [selectedDate, setSelectedDate] = useState(initial ?? new Date().toISOString().slice(0, 10));
  return { selectedDate, setSelectedDate };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
