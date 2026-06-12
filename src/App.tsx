import { Route, Routes, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ChallengePanel } from './components/challenges/ChallengePanel';
import { VisionboardPanel } from './components/visionboard/VisionboardPanel';
import { ShopPanel } from './components/shop/ShopPanel';
import { WalletPanel } from './components/wallet/WalletPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { CalendarPage } from './pages/CalendarPage';

import { SyncAuthPrompt } from './components/settings/SyncAuthPrompt';
import { OnboardingOverlay } from './components/onboarding/OnboardingOverlay';
import { hasStoredAppData } from './lib/dataBackup';

export function App() {
  const [onboardingRequired, setOnboardingRequired] = useState(() => !hasStoredAppData());

  return (
    <AppShell>
      {onboardingRequired && (
        <OnboardingOverlay onComplete={() => setOnboardingRequired(false)} />
      )}
      <SyncAuthPrompt />
      <Routes>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/challenges" element={<ChallengePanel />} />
        <Route path="/visionboard" element={<VisionboardPanel />} />
        <Route path="/bucketlist" element={<Navigate to="/visionboard" replace />} />
        <Route path="/shop" element={<ShopPanel />} />
        <Route path="/wallet" element={<WalletPanel />} />
        <Route path="/settings" element={<SettingsPanel />} />
      </Routes>
    </AppShell>
  );
}
