import { useEffect, useState } from 'react';

const MAX_SUGGESTIONS = 5;
const VIEWPORT_RESERVED_PX = 430;
const ITEM_HEIGHT_PX = 68;

export function useReminderSuggestionLimit(max = MAX_SUGGESTIONS): number {
  const [limit, setLimit] = useState(Math.min(max, 3));

  useEffect(() => {
    const measure = () => {
      const available = Math.max(0, window.innerHeight - VIEWPORT_RESERVED_PX);
      const fit = Math.max(1, Math.floor(available / ITEM_HEIGHT_PX));
      setLimit(Math.min(max, fit));
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [max]);

  return limit;
}
