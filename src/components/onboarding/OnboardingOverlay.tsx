import { useRef, useState } from 'react';
import { Languages, Moon, Plus, Sparkles, Sun, Upload, UserPlus } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { useLocale } from '../../i18n/LocaleProvider';
import type { Locale } from '../../i18n/types';
import { LOCALES } from '../../i18n/types';
import { translate } from '../../i18n/translate';
import { useTheme, type ThemeMode } from '../../lib/theme';
import {
  parseBackup,
  persistInitialAppState,
  reloadApp,
  saveBackupToStorage,
} from '../../lib/dataBackup';
import { isTauriApp } from '../../domain/services/CalDavApi';
import { CalDavAccountModal } from '../settings/SettingsPanel';
import { AppleRemindersAccountModal } from '../settings/AppleRemindersPanel';

type Step = 'language' | 'appearance' | 'path' | 'import' | 'caldav' | 'apple';
type SetupPath = 'new' | 'import' | null;

interface OnboardingOverlayProps {
  onComplete: () => void;
}

export function OnboardingOverlay({ onComplete }: OnboardingOverlayProps) {
  const { t, setLocale } = useLocale();
  const { mode, setMode } = useTheme();
  const { app } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('language');
  const [languageChoice, setLanguageChoice] = useState<Locale>('de');
  const [setupPath, setSetupPath] = useState<SetupPath>(null);
  const [error, setError] = useState('');
  const [caldavModalOpen, setCaldavModalOpen] = useState(false);
  const [appleModalOpen, setAppleModalOpen] = useState(false);

  const onLanguageStep = step === 'language';
  const tEn = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
  const tView = onLanguageStep ? tEn : t;

  const calDavCount = app.calDavAccounts.getAll().length;
  const appleCount = app.appleRemindersAccounts.getAll().length;

  const steps: Step[] =
    setupPath === 'import'
      ? ['language', 'appearance', 'path', 'import']
      : setupPath === 'new'
        ? ['language', 'appearance', 'path', 'caldav', 'apple']
        : ['language', 'appearance', 'path'];

  const stepIndex = Math.max(0, steps.indexOf(step));

  const finish = () => {
    persistInitialAppState(app.getSnapshot());
    onComplete();
  };

  const goBack = () => {
    setError('');
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]!);
  };

  const goNextFromLanguage = () => {
    setLocale(languageChoice);
    setStep('appearance');
  };

  const goNextFromAppearance = () => {
    setStep('path');
  };

  const goNextFromPath = () => {
    if (!setupPath) {
      setError(t('onboarding.errorPath'));
      return;
    }
    setError('');
    setStep(setupPath === 'import' ? 'import' : 'caldav');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseBackup(JSON.parse(text));
      saveBackupToStorage(parsed);
      reloadApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.data.importFailed'));
    }
  };

  return (
    <div className="ll-onboarding-overlay" role="dialog" aria-modal="true">
      <div className="ll-onboarding-panel">
        <header className="ll-onboarding-header">
          <h1>{tView('onboarding.title')}</h1>
          <p>{tView('onboarding.subtitle')}</p>
        </header>

        <div className="ll-onboarding-progress">
          {steps.map((s, i) => (
            <span key={s} className={i <= stepIndex ? 'active' : ''} />
          ))}
        </div>

        {error && <p className="ll-onboarding-error">{error}</p>}

        {step === 'language' && (
          <section className="ll-onboarding-step">
            <h2>{tEn('onboarding.languageTitle')}</h2>
            <p className="ll-onboarding-hint">{tEn('onboarding.languageHint')}</p>
            <div className="ll-segment stretch">
              {LOCALES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={languageChoice === l.id ? 'active' : ''}
                  onClick={() => setLanguageChoice(l.id)}
                >
                  <Languages size={15} aria-hidden />
                  <span>{l.id === 'en' ? tEn('onboarding.languageEn') : tEn('onboarding.languageDe')}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'appearance' && (
          <section className="ll-onboarding-step">
            <h2>{t('onboarding.appearanceTitle')}</h2>
            <p className="ll-onboarding-hint">{t('onboarding.appearanceHint')}</p>
            <div className="ll-segment stretch">
              {(['light', 'dark'] as ThemeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={mode === m ? 'active' : ''}
                  onClick={() => setMode(m)}
                >
                  {m === 'light' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
                  <span>{m === 'light' ? t('settings.appearance.light') : t('settings.appearance.dark')}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'path' && (
          <section className="ll-onboarding-step">
            <h2>{t('onboarding.pathTitle')}</h2>
            <p className="ll-onboarding-hint">{t('onboarding.pathHint')}</p>
            <div className="ll-onboarding-cards">
              <button
                type="button"
                className={`ll-onboarding-card${setupPath === 'new' ? ' selected' : ''}`}
                onClick={() => setSetupPath('new')}
              >
                <UserPlus size={22} aria-hidden />
                <strong>{t('onboarding.newTitle')}</strong>
                <span>{t('onboarding.newDesc')}</span>
              </button>
              <button
                type="button"
                className={`ll-onboarding-card${setupPath === 'import' ? ' selected' : ''}`}
                onClick={() => setSetupPath('import')}
              >
                <Upload size={22} aria-hidden />
                <strong>{t('onboarding.importTitle')}</strong>
                <span>{t('onboarding.importDesc')}</span>
              </button>
            </div>
          </section>
        )}

        {step === 'import' && (
          <section className="ll-onboarding-step">
            <h2>{t('onboarding.importStepTitle')}</h2>
            <p className="ll-onboarding-hint">{t('onboarding.importStepHint')}</p>
            <button type="button" className="ll-btn primary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
              {t('settings.data.import')}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
          </section>
        )}

        {step === 'caldav' && (
          <section className="ll-onboarding-step">
            <h2>{t('onboarding.caldavTitle')}</h2>
            <p className="ll-onboarding-hint">{t('onboarding.caldavHint')}</p>
            <ul className="ll-onboarding-list">
              <li>{t('settings.intro.caldav')}</li>
            </ul>
            {calDavCount > 0 && (
              <p className="ll-onboarding-hint">
                {t('onboarding.accountsLinked', { count: calDavCount })}
              </p>
            )}
            <button
              type="button"
              className="ll-btn"
              disabled={!isTauriApp()}
              onClick={() => setCaldavModalOpen(true)}
            >
              <Plus size={16} />
              {t('settings.addAccount')}
            </button>
            {!isTauriApp() && <p className="ll-onboarding-hint">{t('settings.desktopOnly')}</p>}
          </section>
        )}

        {step === 'apple' && (
          <section className="ll-onboarding-step">
            <h2>
              {t('onboarding.appleTitle')} <span className="ll-beta-tag">{t('common.beta')}</span>
            </h2>
            <p className="ll-onboarding-hint">{t('onboarding.appleHint')}</p>
            <ul className="ll-onboarding-list">
              <li>{t('settings.intro.appleReminders')}</li>
            </ul>
            {appleCount > 0 && (
              <p className="ll-onboarding-hint">
                {t('onboarding.accountsLinked', { count: appleCount })}
              </p>
            )}
            <button
              type="button"
              className="ll-btn"
              disabled={!isTauriApp()}
              onClick={() => setAppleModalOpen(true)}
            >
              <Plus size={16} />
              {t('appleReminders.addAccount')}
            </button>
            {!isTauriApp() && <p className="ll-onboarding-hint">{t('settings.desktopOnly')}</p>}
          </section>
        )}

        <footer className="ll-onboarding-footer">
          {stepIndex > 0 && step !== 'import' && (
            <button type="button" className="ll-btn ghost" onClick={goBack}>
              {t('common.back')}
            </button>
          )}
          <div className="ll-onboarding-footer-spacer" />
          {step === 'language' && (
            <button type="button" className="ll-btn primary" onClick={goNextFromLanguage}>
              {tEn('common.next')}
            </button>
          )}
          {step === 'appearance' && (
            <button type="button" className="ll-btn primary" onClick={goNextFromAppearance}>
              {t('common.next')}
            </button>
          )}
          {step === 'path' && (
            <button type="button" className="ll-btn primary" onClick={goNextFromPath}>
              {t('common.next')}
            </button>
          )}
          {step === 'caldav' && (
            <>
              <button type="button" className="ll-btn ghost" onClick={() => setStep('apple')}>
                {t('onboarding.skip')}
              </button>
              <button type="button" className="ll-btn primary" onClick={() => setStep('apple')}>
                {t('common.next')}
              </button>
            </>
          )}
          {step === 'apple' && (
            <button type="button" className="ll-btn primary" onClick={finish}>
              <Sparkles size={16} />
              {t('onboarding.finish')}
            </button>
          )}
        </footer>
      </div>

      <CalDavAccountModal open={caldavModalOpen} accountId={null} onClose={() => setCaldavModalOpen(false)} />
      <AppleRemindersAccountModal open={appleModalOpen} accountId={null} onClose={() => setAppleModalOpen(false)} />
    </div>
  );
}
