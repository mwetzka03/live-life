import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import { subscribeBackgroundSync, type BackgroundSyncState } from '../../lib/backgroundSync';

export function BackgroundSyncBar() {
  const { t } = useLocale();
  const [syncState, setSyncState] = useState<BackgroundSyncState>({ active: false, extended: false });

  useEffect(() => subscribeBackgroundSync(setSyncState), []);

  if (!syncState.active) return null;

  return (
    <div className="ll-background-sync-bar" role="status" aria-live="polite">
      <RefreshCw size={14} className="spin" />
      {syncState.extended ? t('syncAuth.backgroundExtended') : t('syncAuth.backgroundActive')}
    </div>
  );
}
