import './app.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { LocaleProvider } from './i18n/LocaleProvider';
import { DeveloperModeProvider } from './lib/developerMode';
import { ThemeProvider } from './lib/theme';
import { LoadingProvider } from './lib/loading/LoadingProvider';
import { StartupSplashProvider } from './lib/startupSplash/StartupSplashProvider';
import { useAppBoot } from './hooks/useAppBoot';

function AppRoot() {
  useAppBoot();
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <DeveloperModeProvider>
          <LoadingProvider>
            <StartupSplashProvider>
              <BrowserRouter>
                <AppRoot />
              </BrowserRouter>
            </StartupSplashProvider>
          </LoadingProvider>
        </DeveloperModeProvider>
      </LocaleProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
