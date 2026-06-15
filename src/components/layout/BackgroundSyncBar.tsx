import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import { subscribeBackgroundSync, type BackgroundSyncState } from '../../lib/backgroundSync';

export function BackgroundSyncBar() {
  const { t } = useLocale();
  const [syncState, setSyncState] = useState<BackgroundSyncState>({
    active: false,
    messageKey: 'syncAuth.backgroundActive',
  });

  useEffect(() => subscribeBackgroundSync(setSyncState), []);

  if (!syncState.active) return null;

  return (
    <div className="ll-background-sync-bar" role="status" aria-live="polite">
      <RefreshCw size={14} className="ll-spin" />
      {t(syncState.messageKey)}
    </div>
  );
}
