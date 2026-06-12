import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Edit3,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type { AppleRemindersLinkedList } from '../../domain/models/AppData';
import { AppleRemindersApi, invokeErrorText } from '../../domain/services/AppleRemindersApi';
import type { AppleRemindersListInfo } from '../../domain/services/AppleRemindersApi';
import { isTauriApp } from '../../domain/services/CalDavApi';
import { useAppState } from '../../hooks/useAppState';
import { appleRemindersAccountSummary } from '../../i18n/accountSummary';
import { useLocale } from '../../i18n/LocaleProvider';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { Modal } from '../common/Modal';
import { InfoTip } from '../common/InfoTip';

function isErrorStatus(status: string): boolean {
  const lower = status.toLowerCase();
  return (
    lower.includes('fehl') ||
    lower.includes('fail') ||
    lower.includes('ungültig') ||
    lower.includes('invalid') ||
    lower.includes('fehlt') ||
    lower.includes('required') ||
    lower.includes('pflicht')
  );
}

export function AppleRemindersPanel() {
  const { app } = useAppState();
  const { t, dict, locale } = useLocale();
  const { isLoading, runWithLoading } = useLoading();
  const accounts = app.appleRemindersAccounts.getAll();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncAllRunning, setSyncAllRunning] = useState(false);
  const [message, setMessage] = useState('');
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3500);
  };

  const syncAccount = async (id: string) => {
    setSyncingId(id);
    try {
      const result = await runWithLoading(
        () => app.syncAppleRemindersAccount(id),
        t('loading.remindersSync'),
      );
      showMessage(
        result.failedCalendars.length > 0
          ? t('settings.sync.okSkipped', {
              imported: result.imported,
              updated: result.updated,
              skipped: result.failedCalendars.map((f) => f.split(':')[0]).join(', '),
            })
          : t('settings.sync.okFull', {
              imported: result.imported,
              updated: result.updated,
              removed: result.removed,
            }),
      );
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t('common.syncFailed'));
    } finally {
      setSyncingId(null);
    }
  };

  const syncAll = async () => {
    setSyncAllRunning(true);
    try {
      await runWithLoading(
        () => app.syncAllAppleRemindersAccounts(),
        t('loading.allRemindersSync'),
      );
      showMessage(t('settings.sync.allApple'));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t('common.syncFailed'));
    } finally {
      setSyncAllRunning(false);
    }
  };

  return (
    <>
      {message && <div className="ll-toast">{message}</div>}

      <article className="ll-panel">
        <header className="ll-panel-head ll-panel-head-split">
          <div className="ll-panel-head-main">
            <Bell size={18} />
            <h2>
              {t('appleReminders.title')}{' '}
              <span className="ll-beta-tag">{t('common.beta')}</span>
              <InfoTip text={t('help.appleReminders')} />
            </h2>
          </div>
          <button
            type="button"
            className="ll-btn primary compact"
            onClick={() => {
              setEditingAccountId(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> {t('appleReminders.addAccount')}
          </button>
        </header>
        <p className="ll-panel-desc">{t('appleReminders.desc')}</p>

        <div className="ll-alert warning compact with-icon">
          <AlertTriangle size={16} aria-hidden />
          <span>{t('appleReminders.delayHint')}</span>
        </div>

        {accounts.length === 0 ? (
          <div className="ll-empty compact">
            <Bell size={28} />
            <p>{t('appleReminders.empty')}</p>
          </div>
        ) : (
          <ul className="ll-account-list">
            {accounts.map((account) => (
              <li key={account.id} className="ll-account-item">
                <div>
                  <strong>{account.name}</strong>
                  <span>
                    {account.appleId} ·{' '}
                    {appleRemindersAccountSummary(account, dict.accountSummary.appleReminders)}
                  </span>
                  {account.lists.filter((l) => l.enabled).length > 0 && (
                    <ul className="ll-account-calendars">
                      {account.lists
                        .filter((l) => l.enabled)
                        .map((list) => (
                          <li key={list.guid}>{list.name}</li>
                        ))}
                    </ul>
                  )}
                  <span className="muted">
                    {account.lastSyncAt
                      ? t('settings.caldav.lastSync', {
                          datetime: new Date(account.lastSyncAt).toLocaleString(dateLocale),
                        })
                      : t('settings.caldav.neverSynced')}
                  </span>
                  {account.lastSyncError && <span className="error">{account.lastSyncError}</span>}
                </div>
                <div className="ll-account-actions">
                  <label className="ll-toggle">
                    <input
                      type="checkbox"
                      checked={account.enabled}
                      onChange={(e) =>
                        app.updateAppleRemindersAccount(account.id, { enabled: e.target.checked })
                      }
                    />
                    {t('common.active')}
                  </label>
                  <label className="ll-toggle">
                    <input
                      type="checkbox"
                      checked={account.autoSync}
                      onChange={(e) =>
                        app.updateAppleRemindersAccount(account.id, { autoSync: e.target.checked })
                      }
                    />
                    {t('common.autoSync')}
                  </label>
                  <button
                    type="button"
                    className="ll-btn small"
                    disabled={syncingId === account.id || isLoading || !isTauriApp()}
                    onClick={() => syncAccount(account.id)}
                  >
                    <RefreshCw size={14} />
                    {t('common.sync')}
                  </button>
                  <button
                    type="button"
                    className="ll-icon-btn"
                    title={t('appleReminders.editAccountTitle')}
                    onClick={() => {
                      setEditingAccountId(account.id);
                      setModalOpen(true);
                    }}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    className="ll-icon-btn danger"
                    onClick={() => app.deleteAppleRemindersAccount(account.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {accounts.length > 0 && (
          <div className="ll-panel-footer">
            <button
              type="button"
              className="ll-btn ghost compact"
              disabled={syncAllRunning || isLoading || !isTauriApp()}
              onClick={syncAll}
            >
              <RefreshCw size={16} />
              {t('appleReminders.syncAll')}
            </button>
          </div>
        )}
      </article>

      <AppleRemindersAccountModal
        open={modalOpen}
        accountId={editingAccountId}
        onClose={() => {
          setModalOpen(false);
          setEditingAccountId(null);
        }}
      />
    </>
  );
}

interface AppleRemindersAccountModalProps {
  open: boolean;
  accountId: string | null;
  onClose: () => void;
}

export function AppleRemindersAccountModal({ open, accountId, onClose }: AppleRemindersAccountModalProps) {
  const { app } = useAppState();
  const { t } = useLocale();
  const { isLoading, runWithLoading } = useLoading();
  const existing = accountId ? app.appleRemindersAccounts.getById(accountId) : undefined;
  const isEdit = !!existing;

  const [name, setName] = useState('');
  const [appleId, setAppleId] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loginDone, setLoginDone] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorDone, setTwoFactorDone] = useState(false);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [lists, setLists] = useState<AppleRemindersListInfo[]>([]);
  const [selectedGuids, setSelectedGuids] = useState<Set<string>>(new Set());
  const [enabled, setEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [status, setStatus] = useState('');

  const hasCredentials = () =>
    Boolean(appleId.trim() && (password || existing?.password));

  const currentStep = !loginDone ? 1 : twoFactorRequired && !twoFactorDone ? 2 : 3;
  const canLogin = hasCredentials() && !loginDone;
  const canConfirm = loginDone && twoFactorRequired && !twoFactorDone;
  const canLoadLists = loginDone && (!twoFactorRequired || twoFactorDone);
  const stepBtnClass = (step: number) =>
    `ll-btn${currentStep === step && !(step === 3 && listsLoaded) ? ' primary' : ''}`;

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setName(existing.name);
      setAppleId(existing.appleId);
      setPassword('');
      setTwoFactorCode('');
      setLoginDone(true);
      setTwoFactorRequired(false);
      setTwoFactorDone(true);
      setListsLoaded(existing.lists.length > 0);
      setLists(existing.lists.map((l) => ({ guid: l.guid, name: l.name })));
      setSelectedGuids(new Set(existing.lists.filter((l) => l.enabled).map((l) => l.guid)));
      setEnabled(existing.enabled);
      setAutoSync(existing.autoSync);
    } else {
      setName('');
      setAppleId('');
      setPassword('');
      setTwoFactorCode('');
      setLoginDone(false);
      setTwoFactorRequired(false);
      setTwoFactorDone(false);
      setListsLoaded(false);
      setLists([]);
      setSelectedGuids(new Set());
      setEnabled(true);
      setAutoSync(true);
    }
    setStatus('');
  }, [open, existing]);

  const draftAccount = () => ({
    id: existing?.id ?? `draft-${appleId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    appleId: appleId.trim(),
    password: password || existing?.password || '',
  });

  const handleTwoFactorError = (error: unknown) => {
    if (AppleRemindersApi.isTwoFactorRequired(error)) {
      setLoginDone(true);
      setTwoFactorRequired(true);
      setTwoFactorDone(false);
      setStatus(AppleRemindersApi.twoFactorMessage(error));
      return true;
    }
    return false;
  };

  const startLogin = async () => {
    if (!hasCredentials()) {
      setStatus(t('appleReminders.modal.needCredentials'));
      return;
    }
    setStatus('');
    try {
      const msg = await runWithLoading(
        () => AppleRemindersApi.testConnection(draftAccount()),
        t('loading.icloudConnect'),
      );
      setLoginDone(true);
      setTwoFactorRequired(false);
      setTwoFactorDone(true);
      setStatus(msg);
    } catch (error) {
      if (!handleTwoFactorError(error)) {
        setStatus(invokeErrorText(error) || t('appleReminders.modal.loginFailed'));
      }
    }
  };

  const confirmTwoFactor = async () => {
    if (!twoFactorCode.trim()) {
      setStatus(t('appleReminders.modal.needCode'));
      return;
    }
    setStatus('');
    try {
      const msg = await runWithLoading(
        () => AppleRemindersApi.confirmTwoFactor(draftAccount(), twoFactorCode.trim()),
        t('loading.twoFactorConfirm'),
      );
      setTwoFactorDone(true);
      setStatus(msg);
    } catch (error) {
      if (!handleTwoFactorError(error)) {
        setStatus(invokeErrorText(error) || t('appleReminders.modal.codeFailed'));
      }
    }
  };

  const discoverLists = async () => {
    if (!canLoadLists) {
      setStatus(t('appleReminders.modal.finishEarlier'));
      return;
    }
    if (!hasCredentials()) {
      setStatus(t('appleReminders.modal.needCredentials'));
      return;
    }
    setStatus('');
    try {
      const discovered = await runWithLoading(
        () => AppleRemindersApi.discoverLists(draftAccount()),
        t('loading.listsLoad'),
      );
      setLists(discovered);
      setSelectedGuids(new Set(discovered.map((l) => l.guid)));
      setListsLoaded(true);
      setStatus(t('appleReminders.modal.listsFound', { count: discovered.length }));
    } catch (error) {
      if (!handleTwoFactorError(error)) {
        setStatus(invokeErrorText(error) || t('appleReminders.modal.listsFailed'));
      }
    }
  };

  const toggleList = (guid: string) => {
    setSelectedGuids((prev) => {
      const next = new Set(prev);
      if (next.has(guid)) next.delete(guid);
      else next.add(guid);
      return next;
    });
  };

  const linkedLists = (): AppleRemindersLinkedList[] =>
    lists.map((list) => ({
      guid: list.guid,
      name: list.name,
      enabled: selectedGuids.has(list.guid),
    }));

  const save = async () => {
    if (!name.trim() || !appleId.trim()) {
      setStatus(t('appleReminders.modal.needNameAndId'));
      return;
    }
    const pwd = password || existing?.password;
    if (!pwd) {
      setStatus(t('appleReminders.modal.needPassword'));
      return;
    }
    if (!listsLoaded || lists.length === 0) {
      setStatus(t('appleReminders.modal.finishStep3'));
      return;
    }
    if (selectedGuids.size === 0) {
      setStatus(t('appleReminders.modal.needList'));
      return;
    }

    setStatus('');
    try {
      await runWithLoading(async () => {
        if (isEdit && accountId) {
          app.updateAppleRemindersAccount(accountId, {
            name: name.trim(),
            appleId: appleId.trim(),
            password: pwd,
            lists: linkedLists(),
            enabled,
            autoSync,
          });
          await app.syncAppleRemindersAccount(accountId);
        } else {
          const account = app.createAppleRemindersAccount({
            name: name.trim(),
            appleId: appleId.trim(),
            password: pwd,
            lists: linkedLists(),
            enabled,
            autoSync,
          });
          await app.syncAppleRemindersAccount(account.id);
        }
      }, t('loading.accountSave'));
      onClose();
    } catch (error) {
      if (!handleTwoFactorError(error)) {
        setStatus(invokeErrorText(error) || t('common.saveFailed'));
      }
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? t('appleReminders.modal.editTitle') : t('appleReminders.modal.connectTitle')}
      onClose={onClose}
      wide
    >
      <div className="ll-form">
        <p className="ll-form-hint">{t('appleReminders.modal.intro')}</p>

        <div className="ll-alert info compact">{t('appleReminders.modal.security')}</div>

        <label>
          {t('appleReminders.modal.displayName')}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('appleReminders.modal.displayNamePlaceholder')}
          />
        </label>

        <div className="ll-form-row">
          <label>
            {t('appleReminders.modal.appleId')}
            <input
              type="email"
              value={appleId}
              onChange={(e) => setAppleId(e.target.value)}
              placeholder={t('appleReminders.modal.appleIdPlaceholder')}
            />
          </label>
          <label>
            {t('appleReminders.modal.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? t('appleReminders.modal.passwordUnchanged') : ''}
            />
          </label>
        </div>

        <label>
          {t('appleReminders.modal.twoFactor')}
          <input
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s/g, ''))}
            placeholder={t('appleReminders.modal.twoFactorPlaceholder')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            disabled={!twoFactorRequired || twoFactorDone}
          />
        </label>
        {currentStep === 2 && <p className="ll-form-hint">{t('appleReminders.modal.step2Hint')}</p>}
        {currentStep === 3 && !listsLoaded && (
          <p className="ll-form-hint">{t('appleReminders.modal.step3Hint')}</p>
        )}

        <div className="ll-form-row ll-wizard-steps">
          <button
            type="button"
            className={stepBtnClass(1)}
            disabled={isLoading || !isTauriApp() || !canLogin}
            onClick={startLogin}
          >
            {t('appleReminders.modal.stepLogin')}
          </button>
          <button
            type="button"
            className={stepBtnClass(2)}
            disabled={isLoading || !isTauriApp() || !canConfirm}
            onClick={confirmTwoFactor}
          >
            {t('appleReminders.modal.stepConfirm')}
          </button>
          <button
            type="button"
            className={stepBtnClass(3)}
            disabled={isLoading || !isTauriApp() || !canLoadLists}
            onClick={discoverLists}
          >
            {t('appleReminders.modal.stepLists')}
          </button>
        </div>

        {lists.length > 0 && (
          <div className="ll-calendar-picker">
            <div className="ll-calendar-picker-head">
              <strong>{t('appleReminders.modal.pickLists')}</strong>
              <div className="ll-inline-actions">
                <button
                  type="button"
                  className="ll-btn small"
                  onClick={() => setSelectedGuids(new Set(lists.map((l) => l.guid)))}
                >
                  {t('common.all')}
                </button>
                <button
                  type="button"
                  className="ll-btn small ghost"
                  onClick={() => setSelectedGuids(new Set())}
                >
                  {t('common.none')}
                </button>
              </div>
            </div>
            <ul className="ll-calendar-checklist">
              {lists.map((list) => (
                <li key={list.guid}>
                  <label className="ll-calendar-check">
                    <input
                      type="checkbox"
                      checked={selectedGuids.has(list.guid)}
                      onChange={() => toggleList(list.guid)}
                    />
                    <span>{list.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ll-form-row">
          <label className="ll-toggle block">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            {t('appleReminders.modal.accountActive')}
          </label>
          <label className="ll-toggle block">
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            {t('appleReminders.modal.syncOnStart')}
          </label>
        </div>

        {status && (
          <p className={`ll-form-status${isErrorStatus(status) ? ' error' : ''}`}>{status}</p>
        )}

        <div className="ll-form-actions">
          <div className="ll-form-actions-right">
            <button type="button" className="ll-btn ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="button" className="ll-btn primary" disabled={isLoading} onClick={save}>
              {t('appleReminders.modal.saveAndSync')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
