import { ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleProvider';
import {
  getStartupDevLogEntries,
  subscribeStartupDevLog,
  type DevLogEntry,
} from '../../lib/startupDevLog';

interface DevTerminalProps {
  defaultOpen?: boolean;
}

export function DevTerminal({ defaultOpen = false }: DevTerminalProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [entries, setEntries] = useState<DevLogEntry[]>(() => getStartupDevLogEntries());

  useEffect(() => subscribeStartupDevLog(setEntries), []);

  return (
    <div className="ll-startup-dev-terminal">
      <button
        type="button"
        className="ll-startup-dev-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <Terminal size={14} />
        <span>{t('devLog.title')}</span>
        <span className="ll-startup-dev-count">{entries.length}</span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {open && (
        <pre className="ll-startup-dev-log" aria-live="polite">
          {entries.length === 0 && <span className="ll-startup-dev-empty">{t('devLog.empty')}</span>}
          {entries.map((entry) => (
            <div key={entry.id} className={`ll-startup-dev-line level-${entry.level}`}>
              <time>{entry.time}</time>
              {entry.context && <span className="ll-dev-log-ctx">[{entry.context}]</span>}
              <span>{entry.message}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
