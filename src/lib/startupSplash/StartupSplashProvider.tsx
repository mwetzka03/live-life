import Lottie from 'lottie-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import startupAnimation from '../../assets/lottie/startup.json';
import { DevTerminal } from '../../components/common/DevTerminal';
import { useDeveloperMode } from '../developerMode';

interface StartupSplashState {
  visible: boolean;
  message: string;
}

interface StartupSplashContextValue {
  show: (message: string) => void;
  hide: () => void;
  updateMessage: (message: string) => void;
}

const StartupSplashContext = createContext<StartupSplashContextValue | null>(null);

export function StartupSplashProvider({ children }: { children: ReactNode }) {
  const { enabled: devModeEnabled } = useDeveloperMode();
  const [state, setState] = useState<StartupSplashState>({
    visible: false,
    message: '',
  });

  const show = useCallback((message: string) => {
    setState({ visible: true, message });
  }, []);

  const hide = useCallback(() => {
    setState({ visible: false, message: '' });
  }, []);

  const updateMessage = useCallback((message: string) => {
    setState((prev) => (prev.visible ? { ...prev, message } : prev));
  }, []);

  const value = useMemo(
    () => ({ show, hide, updateMessage }),
    [hide, show, updateMessage],
  );

  return (
    <StartupSplashContext.Provider value={value}>
      {children}
      {state.visible && (
        <div
          className="ll-loading-overlay ll-startup-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="ll-loading-card ll-startup-card">
            <Lottie
              animationData={startupAnimation}
              loop
              className="ll-loading-lottie"
              aria-hidden
            />
            {state.message && <p className="ll-loading-message">{state.message}</p>}
            {devModeEnabled && <DevTerminal defaultOpen={false} />}
          </div>
        </div>
      )}
    </StartupSplashContext.Provider>
  );
}

export function useStartupSplash(): StartupSplashContextValue {
  const ctx = useContext(StartupSplashContext);
  if (!ctx) {
    throw new Error('useStartupSplash must be used within StartupSplashProvider');
  }
  return ctx;
}
