import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ChallengePanel } from './components/challenges/ChallengePanel';
import { BucketlistPanel } from './components/bucketlist/BucketlistPanel';
import { ShopPanel } from './components/shop/ShopPanel';
import { WalletPanel } from './components/wallet/WalletPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { CalendarPage } from './pages/CalendarPage';

import { SyncAuthPrompt } from './components/settings/SyncAuthPrompt';

export function App() {
  return (
    <AppShell>
      <SyncAuthPrompt />
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/challenges" element={<ChallengePanel />} />
        <Route path="/bucketlist" element={<BucketlistPanel />} />
        <Route path="/shop" element={<ShopPanel />} />
        <Route path="/wallet" element={<WalletPanel />} />
        <Route path="/settings" element={<SettingsPanel />} />
      </Routes>
    </AppShell>
  );
}
