import { useEffect, useState } from 'react';
import { AlertTriangle, Cloud, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppleRemindersApi, invokeErrorText } from '../../domain/services/AppleRemindersApi';
import { getAppState } from '../../domain/services/AppStateService';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { subscribeAppBootComplete } from '../../hooks/useAppBoot';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { collectSyncAuthIssues, type SyncAuthIssue } from '../../lib/syncAuthIssues';
import { Modal } from '../common/Modal';

export function SyncAuthPrompt() {
  const { app } = useAppState();
  const { t } = useLocale();
  const navigate = useNavigate();
  const { runWithLoading } = useLoading();
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<SyncAuthIssue[]>([]);
  const [twoFactorCodes, setTwoFactorCodes] = useState<Record<string, string>>({});
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});

  const refreshIssues = () => {
    const next = collectSyncAuthIssues(getAppState());
    setIssues(next);
    setOpen(next.length > 0);
  };

  useEffect(() => subscribeAppBootComplete(refreshIssues), []);

  useEffect(() => {
    return app.subscribe(refreshIssues);
  }, [app]);

  const goToSettings = () => {
    setOpen(false);
    navigate('/settings');
  };

  const confirmAppleTwoFactor = async (issue: SyncAuthIssue) => {
    const code = twoFactorCodes[issue.accountId]?.trim();
    if (!code) {
      setActionStatus((prev) => ({ ...prev, [issue.accountId]: t('syncAuth.needCode') }));
      return;
    }

    const account = app.appleRemindersAccounts.getById(issue.accountId);
    if (!account) return;

    try {
      await runWithLoading(async () => {
        await AppleRemindersApi.confirmTwoFactor(account, code);
        await app.syncAppleRemindersAccount(account.id);
      }, t('loading.authConfirm'));
      setTwoFactorCodes((prev) => ({ ...prev, [issue.accountId]: '' }));
      setActionStatus((prev) => ({ ...prev, [issue.accountId]: '' }));
      refreshIssues();
    } catch (error) {
      if (AppleRemindersApi.isTwoFactorRequired(error)) {
        setActionStatus((prev) => ({
          ...prev,
          [issue.accountId]: AppleRemindersApi.twoFactorMessage(error),
        }));
      } else {
        setActionStatus((prev) => ({
          ...prev,
          [issue.accountId]: invokeErrorText(error) || t('syncAuth.confirmFailed'),
        }));
      }
    }
  };

  const retrySync = async (issue: SyncAuthIssue) => {
    try {
      await runWithLoading(async () => {
        if (issue.kind === 'caldav') {
          await app.syncCalDavAccount(issue.accountId);
        } else {
          await app.syncAppleRemindersAccount(issue.accountId);
        }
      }, t('loading.syncRunning'));
      setActionStatus((prev) => ({ ...prev, [issue.accountId]: '' }));
      refreshIssues();
    } catch (error) {
      setActionStatus((prev) => ({
        ...prev,
        [issue.accountId]: invokeErrorText(error) || t('common.syncFailed'),
      }));
    }
  };

  if (!open || issues.length === 0) return null;

  return (
    <Modal open={open} title={t('syncAuth.title')} onClose={() => setOpen(false)} wide>
      <div className="ll-form">
        <p className="ll-form-hint">
          <AlertTriangle size={14} /> {t('syncAuth.hint')}
        </p>

        <ul className="ll-sync-auth-list">
          {issues.map((issue) => (
            <li key={`${issue.kind}-${issue.accountId}`} className="ll-sync-auth-item">
              <div className="ll-sync-auth-item-head">
                <Cloud size={16} />
                <div>
                  <strong>{issue.accountName}</strong>
                  <span>
                    {issue.kind === 'apple-reminders' ? t('syncAuth.kindApple') : t('syncAuth.kindCaldav')}
                  </span>
                </div>
              </div>
              <p className="ll-sync-auth-message">{issue.message}</p>

              {issue.needsTwoFactor && issue.kind === 'apple-reminders' && (
                <div className="ll-form-row">
                  <label>
                    {t('syncAuth.twoFactor')}
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder={t('syncAuth.twoFactorPlaceholder')}
                      value={twoFactorCodes[issue.accountId] ?? ''}
                      onChange={(e) =>
                        setTwoFactorCodes((prev) => ({ ...prev, [issue.accountId]: e.target.value }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="ll-btn primary"
                    onClick={() => void confirmAppleTwoFactor(issue)}
                  >
                    {t('syncAuth.confirmAndSync')}
                  </button>
                </div>
              )}

              {actionStatus[issue.accountId] && (
                <p className="ll-sync-auth-status">{actionStatus[issue.accountId]}</p>
              )}

              <div className="ll-sync-auth-actions">
                {!issue.needsTwoFactor && (
                  <button type="button" className="ll-btn small ghost" onClick={() => void retrySync(issue)}>
                    <RefreshCw size={14} /> {t('syncAuth.retry')}
                  </button>
                )}
                <button type="button" className="ll-btn small ghost" onClick={goToSettings}>
                  {t('syncAuth.openSettings')}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="ll-form-actions">
          <div className="ll-form-actions-right">
            <button type="button" className="ll-btn ghost" onClick={() => setOpen(false)}>
              {t('common.later')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
