import { useState } from 'react';
import { AlertTriangle, RefreshCw, Upload } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import { isTauriApp } from '../../domain/services/CalDavApi';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { runManualSync, runUploadSync } from '../../lib/manualSync';

interface PendingOutboxBarProps {
  outboxCount: number;
}

export function PendingOutboxBar({ outboxCount }: PendingOutboxBarProps) {
  const { t } = useLocale();
  const { runWithLoading } = useLoading();
  const [busy, setBusy] = useState(false);

  if (!isTauriApp() || outboxCount <= 0) return null;

  const onUpload = () => {
    if (busy) return;
    setBusy(true);
    void runWithLoading(() => runUploadSync(), t('loading.syncUpload')).finally(() => setBusy(false));
  };

  const onFullSync = () => {
    if (busy) return;
    setBusy(true);
    void runWithLoading(() => runManualSync(), t('loading.syncRunning')).finally(() => setBusy(false));
  };

  return (
    <div className="ll-pending-outbox-bar" role="status" aria-live="polite">
      <div className="ll-pending-outbox-bar-message">
        <AlertTriangle size={16} aria-hidden />
        <span>{t('nav.syncOutboxWarning', { count: outboxCount })}</span>
      </div>
      <div className="ll-pending-outbox-bar-actions">
        <button
          type="button"
          className="ll-btn small ghost ll-pending-outbox-btn"
          onClick={onUpload}
          disabled={busy}
          title={t('nav.syncUpload')}
          aria-label={t('nav.syncUpload')}
        >
          <Upload size={16} className={busy ? 'll-spin' : undefined} />
          <span>{t('nav.syncUpload')}</span>
        </button>
        <button
          type="button"
          className="ll-btn small primary ll-pending-outbox-btn"
          onClick={onFullSync}
          disabled={busy}
          title={t('nav.syncRefresh')}
          aria-label={t('nav.syncRefresh')}
        >
          <RefreshCw size={16} className={busy ? 'll-spin' : undefined} />
          <span>{t('nav.syncRefresh')}</span>
        </button>
      </div>
    </div>
  );
}
