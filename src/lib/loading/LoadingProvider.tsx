import Lottie from 'lottie-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DevTerminal } from '../../components/common/DevTerminal';
import loadingAnimation from '../../assets/lottie/loading.json';
import { translate } from '../../i18n/translate';
import { LOCALE_STORAGE_KEY, type Locale } from '../../i18n/types';
import { useDeveloperMode } from '../developerMode';
import { devLog } from '../startupDevLog';
import { showErrorReport } from '../errorReport';
import { yieldToUi } from './yieldToUi';

function defaultLoadingLabel(): string {
  const loc = (localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'de') as Locale;
  return translate(loc, 'common.action');
}

interface LoadingState {
  visible: boolean;
  message?: string;
}

interface LoadingContextValue {
  isLoading: boolean;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  resetLoading: () => void;
  updateLoadingMessage: (message: string) => void;
  runWithLoading: <T>(fn: () => Promise<T>, message?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const depthRef = useRef(0);
  const { enabled: devModeEnabled } = useDeveloperMode();
  const [state, setState] = useState<LoadingState>({
    visible: false,
  });

  const showLoading = useCallback((message?: string) => {
    depthRef.current += 1;
    setState({ visible: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) {
      setState((prev) => ({ ...prev, visible: false, message: undefined }));
    }
  }, []);

  const resetLoading = useCallback(() => {
    depthRef.current = 0;
    setState((prev) => ({ ...prev, visible: false, message: undefined }));
  }, []);

  const updateLoadingMessage = useCallback((message: string) => {
    setState((prev) => (prev.visible ? { ...prev, message } : prev));
  }, []);

  const runWithLoading = useCallback(
    async <T,>(fn: () => Promise<T>, message?: string): Promise<T> => {
      const label = message ?? defaultLoadingLabel();
      showLoading(message);
      devLog(`Start: ${label}`, 'info', 'Loading');
      await yieldToUi();
      try {
        const result = await fn();
        devLog(`Fertig: ${label}`, 'ok', 'Loading');
        return result;
      } catch (error) {
        devLog(
          `Fehler bei „${label}“: ${error instanceof Error ? error.message : String(error)}`,
          'error',
          'Loading',
        );
        showErrorReport({
          title: label,
          error,
          context: 'LoadingProvider.runWithLoading',
          actionFlow: [`User action: ${label}`, 'Loading overlay shown', 'Async operation failed'],
        });
        throw error;
      } finally {
        hideLoading();
      }
    },
    [hideLoading, showLoading],
  );

  const value = useMemo(
    () => ({
      isLoading: state.visible,
      showLoading,
      hideLoading,
      resetLoading,
      updateLoadingMessage,
      runWithLoading,
    }),
    [hideLoading, resetLoading, runWithLoading, showLoading, state.visible, updateLoadingMessage],
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {state.visible && (
        <div className="ll-loading-overlay ll-loading-overlay-with-log" role="status" aria-live="polite" aria-busy="true">
          <div className="ll-loading-card ll-startup-card">
            <Lottie
              animationData={loadingAnimation}
              loop
              className="ll-loading-lottie"
              aria-hidden
            />
            {state.message && <p className="ll-loading-message">{state.message}</p>}
            {devModeEnabled && <DevTerminal defaultOpen={false} />}
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return ctx;
}
