import { useRef, useState } from 'react';
import { Database, Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useAppState } from '../../hooks/useAppState';
import { useLocale } from '../../i18n/LocaleProvider';
import {
  buildBackup,
  clearAppDataKeepSyncAccounts,
  downloadBackupFile,
  parseBackup,
  reloadApp,
  resetAppCompletely,
  saveBackupToStorage,
} from '../../lib/dataBackup';
import { Modal } from '../common/Modal';

type ConfirmAction = 'clearData' | 'resetApp' | null;

export function DataManagementPanel() {
  const { app } = useAppState();
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [message, setMessage] = useState('');
  const [importError, setImportError] = useState('');

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3500);
  };

  const handleExport = () => {
    const backup = buildBackup(app.getSnapshot());
    downloadBackupFile(backup);
    showMessage(t('settings.data.exportDone'));
  };

  const handleImportPick = () => {
    setImportError('');
    fileInputRef.current?.click();
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
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('settings.data.importFailed'));
    }
  };

  const runConfirmedAction = () => {
    if (confirmAction === 'clearData') {
      clearAppDataKeepSyncAccounts();
      reloadApp();
      return;
    }
    if (confirmAction === 'resetApp') {
      resetAppCompletely();
      reloadApp();
    }
  };

  const confirmTitle =
    confirmAction === 'clearData'
      ? t('settings.data.confirmClearTitle')
      : t('settings.data.confirmResetTitle');

  const confirmBody =
    confirmAction === 'clearData'
      ? t('settings.data.confirmClearBody')
      : t('settings.data.confirmResetBody');

  return (
    <>
      {message && <div className="ll-toast">{message}</div>}

      <article className="ll-panel ll-settings-data">
        <header className="ll-panel-head">
          <Database size={18} />
          <h2>{t('settings.data.title')}</h2>
        </header>
        <p className="ll-panel-desc">{t('settings.data.desc')}</p>

        <div className="ll-settings-data-actions">
          <button type="button" className="ll-btn" onClick={handleExport}>
            <Download size={16} />
            {t('settings.data.export')}
          </button>
          <button type="button" className="ll-btn" onClick={handleImportPick}>
            <Upload size={16} />
            {t('settings.data.import')}
          </button>
          <button type="button" className="ll-btn ghost danger" onClick={() => setConfirmAction('clearData')}>
            <Trash2 size={16} />
            {t('settings.data.clearData')}
          </button>
          <button type="button" className="ll-btn ghost danger" onClick={() => setConfirmAction('resetApp')}>
            <RotateCcw size={16} />
            {t('settings.data.resetApp')}
          </button>
        </div>

        {importError && <p className="ll-form-status error">{importError}</p>}

        <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
      </article>

      <Modal open={confirmAction !== null} title={confirmTitle} onClose={() => setConfirmAction(null)}>
        <p className="ll-panel-desc">{confirmBody}</p>
        <div className="ll-form-actions">
          <div className="ll-form-actions-right">
            <button type="button" className="ll-btn ghost" onClick={() => setConfirmAction(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="ll-btn danger" onClick={runConfirmedAction}>
              {t('common.confirm')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
