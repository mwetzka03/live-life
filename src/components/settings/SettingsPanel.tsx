import { useEffect, useState } from 'react';
import {
  CloudOff,
  Edit3,
  Languages,
  Moon,
  Plus,
  RefreshCw,
  Settings2,
  Sun,
  Terminal,
  Trash2,
  Wifi,
} from 'lucide-react';
import type { CalDavCalendarKind, CalDavProvider } from '../../domain/models/AppData';
import { CalDavApi, isTauriApp } from '../../domain/services/CalDavApi';
import type { CalDavCalendarInfo } from '../../domain/services/CalDavApi';
import { useAppState } from '../../hooks/useAppState';
import { accountCalendarSummary } from '../../i18n/accountSummary';
import { useLocale } from '../../i18n/LocaleProvider';
import { LOCALES } from '../../i18n/types';
import { CALDAV_PRESETS, getPreset } from '../../lib/caldavPresets';
import { getCalendarKind, getEnabledCalendars } from '../../lib/caldavAccount';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { useDeveloperMode } from '../../lib/developerMode';
import { useTheme, type ThemeMode } from '../../lib/theme';
import { Modal } from '../common/Modal';
import { DevTerminal } from '../common/DevTerminal';
import { PageHeader, InfoTip } from '../common/InfoTip';
import { DataManagementPanel } from './DataManagementPanel';
import { AppleRemindersPanel } from './AppleRemindersPanel';

export function SettingsPanel() {
  const { app } = useAppState();
  const { isLoading, runWithLoading } = useLoading();
  const { t, dict, locale, setLocale } = useLocale();
  const { mode, setMode } = useTheme();
  const { enabled: devModeEnabled, setEnabled: setDevModeEnabled } = useDeveloperMode();
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';
  const accounts = app.calDavAccounts.getAll();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncAllRunning, setSyncAllRunning] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3500);
  };

  const syncAccount = async (id: string) => {
    setSyncingId(id);
    try {
      const result = await runWithLoading(
        () => app.syncCalDavAccount(id),
        t('loading.calendarSync'),
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
        () => app.syncAllCalDavAccounts(),
        t('loading.allCalendarsSync'),
      );
      showMessage(t('settings.sync.allCalendars'));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t('common.syncFailed'));
    } finally {
      setSyncAllRunning(false);
    }
  };

  return (
    <section className="ll-page ll-scroll-page">
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        info={t('help.settings')}
      />

      {!isTauriApp() && (
        <div className="ll-alert warning">{t('settings.desktopOnly')}</div>
      )}

      {message && <div className="ll-toast">{message}</div>}

      <div className="ll-settings-prefs-grid">
        <article className="ll-panel ll-settings-pref">
          <header className="ll-panel-head">
            <Languages size={18} />
            <h2>{t('settings.language.title')}</h2>
          </header>
          <p className="ll-panel-desc">{t('settings.language.desc')}</p>
          <div className="ll-settings-pref-actions">
            <div className="ll-segment stretch" role="group" aria-label={t('settings.language.title')}>
              {LOCALES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={locale === l.id ? 'active' : ''}
                  onClick={() => setLocale(l.id)}
                >
                  <Languages size={15} aria-hidden />
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="ll-panel ll-settings-pref">
          <header className="ll-panel-head">
            {mode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <h2>{t('settings.appearance.title')}</h2>
          </header>
          <p className="ll-panel-desc">{t('settings.appearance.desc')}</p>
          <div className="ll-settings-pref-actions">
            <div className="ll-segment stretch" role="group" aria-label={t('settings.appearance.title')}>
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
          </div>
        </article>

        <article className="ll-panel ll-settings-pref">
          <header className="ll-panel-head">
            <Terminal size={18} />
            <h2>
              {t('settings.developerMode.title')}
              <InfoTip text={t('help.devLog')} />
            </h2>
          </header>
          <p className="ll-panel-desc">{t('settings.developerMode.desc')}</p>
          <div className="ll-settings-pref-actions">
            <div
              className="ll-segment stretch"
              role="group"
              aria-label={t('settings.developerMode.title')}
            >
              <button
                type="button"
                className={!devModeEnabled ? 'active' : ''}
                onClick={() => setDevModeEnabled(false)}
              >
                <Terminal size={15} aria-hidden />
                <span>{t('common.off')}</span>
              </button>
              <button
                type="button"
                className={devModeEnabled ? 'active' : ''}
                onClick={() => setDevModeEnabled(true)}
              >
                <Terminal size={15} aria-hidden />
                <span>{t('common.on')}</span>
              </button>
            </div>
          </div>
        </article>
      </div>

      {devModeEnabled && (
        <article className="ll-panel ll-settings-dev-panel">
          <header className="ll-panel-head">
            <Terminal size={18} />
            <h2>{t('settings.developerMode.enabled')}</h2>
          </header>
          <DevTerminal defaultOpen />
        </article>
      )}

      <div className="ll-settings-intro-row">
        <article className="ll-panel ll-settings-intro">
          <header className="ll-panel-head">
            <Settings2 size={18} />
            <h2>{t('settings.intro.title')}</h2>
          </header>
          <p className="ll-panel-desc">{t('settings.intro.desc')}</p>
          <ul>
            <li>
              <strong>CalDAV</strong> {t('settings.intro.caldav')}
            </li>
            <li>
              <strong>Apple Reminders ({t('common.beta')})</strong> {t('settings.intro.appleReminders')}
            </li>
            <li>{t('settings.intro.suggestions')}</li>
            <li>
              <strong>{t('common.autoSync')}</strong> {t('settings.intro.autoSync')}
            </li>
          </ul>
        </article>

        <DataManagementPanel />
      </div>

      <div className="ll-settings-grid">
        <article className="ll-panel">
          <header className="ll-panel-head ll-panel-head-split">
            <div className="ll-panel-head-main">
              <Settings2 size={18} />
              <h2>
                {t('settings.caldav.title')}
                <InfoTip text={t('help.calDav')} />
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
              <Plus size={16} /> {t('settings.addAccount')}
            </button>
          </header>
          <p className="ll-panel-desc">{t('settings.caldav.desc')}</p>

          {accounts.length === 0 ? (
            <div className="ll-empty compact">
              <CloudOff size={28} />
              <p>{t('settings.caldav.empty')}</p>
            </div>
          ) : (
            <ul className="ll-account-list">
              {accounts.map((account) => (
                <li key={account.id} className="ll-account-item">
                  <div>
                    <strong>{account.name}</strong>
                    <span>
                      {dict.caldav.presets[account.provider].label} ·{' '}
                      {accountCalendarSummary(account, dict.accountSummary.caldav)}
                    </span>
                    {getEnabledCalendars(account).length > 0 && (
                      <ul className="ll-account-calendars">
                        {getEnabledCalendars(account).map((cal) => (
                          <li key={cal.href}>
                            <span
                              className="ll-calendar-dot"
                              style={{ background: cal.color ?? '#94a3b8' }}
                            />
                            {cal.name}
                            {getCalendarKind(cal) === 'reminders' && (
                              <em className="ll-calendar-hint">{t('settings.caldav.remindersSuffix')}</em>
                            )}
                          </li>
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
                    {account.lastSyncError && (
                      <span className="error">{account.lastSyncError}</span>
                    )}
                  </div>
                  <div className="ll-account-actions">
                    <label className="ll-toggle">
                      <input
                        type="checkbox"
                        checked={account.enabled}
                        onChange={(e) =>
                          app.updateCalDavAccount(account.id, { enabled: e.target.checked })
                        }
                      />
                      {t('common.active')}
                    </label>
                    <label className="ll-toggle">
                      <input
                        type="checkbox"
                        checked={account.autoSync}
                        onChange={(e) =>
                          app.updateCalDavAccount(account.id, { autoSync: e.target.checked })
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
                      title={t('settings.caldav.editAccountTitle')}
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
                      onClick={() => app.deleteCalDavAccount(account.id)}
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
                {t('settings.caldav.syncAll')}
              </button>
            </div>
          )}
        </article>

        <AppleRemindersPanel />

        <article className="ll-panel ll-settings-guide-panel">
          <header className="ll-panel-head">
            <Wifi size={18} />
            <h2>{t('settings.guide.title')}</h2>
          </header>
          <ol className="ll-help-list">
            <li>
              <strong>CalDAV / iCloud:</strong> {t('settings.guide.icloudPassword')}
            </li>
            <li>
              <strong>Google CalDAV:</strong> {t('settings.guide.google')}
            </li>
            <li>{t('settings.guide.setup')}</li>
            <li>
              <strong>Apple Reminders ({t('common.beta')}):</strong> {t('settings.guide.appleReminders')}
            </li>
          </ol>
        </article>
      </div>

      <CalDavAccountModal
        open={modalOpen}
        accountId={editingAccountId}
        onClose={() => {
          setModalOpen(false);
          setEditingAccountId(null);
        }}
      />
    </section>
  );
}

interface CalDavAccountModalProps {
  open: boolean;
  accountId: string | null;
  onClose: () => void;
}

export function CalDavAccountModal({ open, accountId, onClose }: CalDavAccountModalProps) {
  const { app } = useAppState();
  const { isLoading, runWithLoading } = useLoading();
  const { t, dict } = useLocale();
  const existing = accountId ? app.calDavAccounts.getById(accountId) : undefined;
  const isEdit = !!existing;

  const [provider, setProvider] = useState<CalDavProvider>('icloud');
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState(getPreset('icloud').serverUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [calendars, setCalendars] = useState<CalDavCalendarInfo[]>([]);
  const [selectedHrefs, setSelectedHrefs] = useState<Set<string>>(new Set());
  const [kindByHref, setKindByHref] = useState<Record<string, CalDavCalendarKind>>({});
  const [enabled, setEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [status, setStatus] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);

  const presetMeta = dict.caldav.presets[provider];

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setProvider(existing.provider);
      setName(existing.name);
      setServerUrl(existing.serverUrl);
      setUsername(existing.username);
      setPassword('');
      const kinds: Record<string, CalDavCalendarKind> = {};
      for (const c of existing.calendars) {
        kinds[c.href] = getCalendarKind(c);
      }
      setKindByHref(kinds);
      setCalendars(
        existing.calendars.map((c) => ({
          href: c.href,
          name: c.name,
          color: c.color,
          calendarKind: getCalendarKind(c),
        })),
      );
      setSelectedHrefs(new Set(existing.calendars.filter((c) => c.enabled).map((c) => c.href)));
      setEnabled(existing.enabled);
      setAutoSync(existing.autoSync);
      setStatus('');
      setStatusIsError(false);
      return;
    }
    setProvider('icloud');
    setName('');
    setServerUrl(getPreset('icloud').serverUrl);
    setUsername('');
    setPassword('');
    setCalendars([]);
    setSelectedHrefs(new Set());
    setKindByHref({});
    setEnabled(true);
    setAutoSync(true);
    setStatus('');
    setStatusIsError(false);
  }, [open, existing]);

  const onProviderChange = (next: CalDavProvider) => {
    setProvider(next);
    setServerUrl(getPreset(next).serverUrl);
    setCalendars([]);
    setSelectedHrefs(new Set());
    setKindByHref({});
  };

  const getKindForCalendar = (cal: CalDavCalendarInfo): CalDavCalendarKind =>
    kindByHref[cal.href] ?? (cal.calendarKind === 'reminders' ? 'reminders' : 'events');

  const setCalendarKind = (href: string, kind: CalDavCalendarKind) => {
    setKindByHref((prev) => ({ ...prev, [href]: kind }));
  };

  const testAndLoadCalendars = async () => {
    const pwd = password || existing?.password;
    if (!username.trim() || !pwd) {
      setStatus(t('settings.caldavModal.needCredentials'));
      setStatusIsError(true);
      return;
    }
    setStatus(t('settings.caldavModal.loadingProbe'));
    setStatusIsError(false);
    try {
      const list = await runWithLoading(
        () => CalDavApi.discoverCalendars(serverUrl, username, pwd),
        t('loading.calendarsLoad'),
      );
      setCalendars(list);
      setKindByHref((prev) => {
        const next = { ...prev };
        for (const c of list) {
          if (!(c.href in next)) {
            next[c.href] = c.calendarKind === 'reminders' ? 'reminders' : 'events';
          }
        }
        return next;
      });
      if (list.length === 0) {
        setStatus(t('settings.caldavModal.noCalendars'));
        setStatusIsError(true);
      } else {
        const reminderCals = list.filter((c) => {
          const kind = kindByHref[c.href] ?? (c.calendarKind === 'reminders' ? 'reminders' : 'events');
          return kind === 'reminders';
        });
        const preselected = isEdit
          ? new Set([...selectedHrefs, ...list.map((c) => c.href)])
          : new Set(list.map((c) => c.href));
        setSelectedHrefs(preselected);
        setStatus(
          t('settings.caldavModal.foundCalendars', {
            total: list.length,
            reminderCount: reminderCals.length,
            names: reminderCals.map((c) => c.name).join(', ') || '—',
          }),
        );
        setStatusIsError(false);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('common.connectionFailed');
      setStatus(msg);
      setStatusIsError(true);
    }
  };

  const toggleCalendar = (href: string) => {
    setSelectedHrefs((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  const selectAllCalendars = () => setSelectedHrefs(new Set(calendars.map((c) => c.href)));
  const selectNoCalendars = () => setSelectedHrefs(new Set());

  const save = async () => {
    const linked = calendars
      .filter((c) => selectedHrefs.has(c.href))
      .map((c) => ({
        href: c.href,
        name: c.name,
        color: c.color,
        enabled: true,
        calendarKind: getKindForCalendar(c),
      }));

    const pwd = password || existing?.password;
    if (!name.trim() || !username.trim() || !pwd || linked.length === 0) {
      setStatus(t('settings.caldavModal.needFields'));
      setStatusIsError(true);
      return;
    }

    try {
      await runWithLoading(async () => {
        if (isEdit && accountId) {
          app.updateCalDavAccount(accountId, {
            name: name.trim(),
            provider,
            serverUrl: serverUrl.trim(),
            username: username.trim(),
            password: pwd,
            calendars: linked,
            enabled,
            autoSync,
          });
          await app.syncCalDavAccount(accountId);
        } else {
          const account = app.createCalDavAccount({
            name: name.trim(),
            provider,
            serverUrl: serverUrl.trim(),
            username: username.trim(),
            password: pwd,
            calendars: linked,
            enabled,
            autoSync,
          });
          await app.syncCalDavAccount(account.id);
        }
      }, t('loading.accountSave'));
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('common.saveFailed');
      setStatus(msg);
      setStatusIsError(true);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? t('settings.caldavModal.editTitle') : t('settings.caldavModal.addTitle')}
      onClose={onClose}
      wide
    >
      <div className="ll-form">
        <label>
          {t('settings.caldavModal.provider')}
          <select value={provider} onChange={(e) => onProviderChange(e.target.value as CalDavProvider)}>
            {CALDAV_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {dict.caldav.presets[p.id].label}
              </option>
            ))}
          </select>
        </label>

        <p className="ll-form-hint">{presetMeta.hint}</p>

        <label>
          {t('settings.caldavModal.displayName')}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('settings.caldavModal.displayNamePlaceholder')}
          />
        </label>

        <label>
          {t('settings.caldavModal.serverUrl')}
          <input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder={t('settings.caldavModal.serverUrlPlaceholder')}
            disabled={provider !== 'custom'}
          />
        </label>

        <div className="ll-form-row">
          <label>
            {presetMeta.usernameLabel}
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            {t('settings.caldavModal.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? t('settings.caldavModal.passwordUnchanged') : ''}
            />
          </label>
        </div>

        <button
          type="button"
          className="ll-btn"
          disabled={isLoading || !isTauriApp()}
          onClick={testAndLoadCalendars}
        >
          <Wifi size={16} />
          {t('settings.caldavModal.testConnection')}
        </button>

        {calendars.length > 0 && (
          <div className="ll-calendar-picker">
            <div className="ll-calendar-picker-head">
              <strong>{t('settings.caldavModal.pickCalendars')}</strong>
              <div className="ll-inline-actions">
                <button type="button" className="ll-btn small" onClick={selectAllCalendars}>
                  {t('common.all')}
                </button>
                <button type="button" className="ll-btn small ghost" onClick={selectNoCalendars}>
                  {t('common.none')}
                </button>
              </div>
            </div>
            <p className="ll-form-hint">
              {t('settings.caldavModal.pickHint', {
                selected: selectedHrefs.size,
                total: calendars.length,
              })}
            </p>
            <ul className="ll-calendar-checklist">
              {calendars.map((cal) => (
                <li key={cal.href}>
                  <div className="ll-calendar-check-row">
                    <label className="ll-calendar-check">
                      <input
                        type="checkbox"
                        checked={selectedHrefs.has(cal.href)}
                        onChange={() => toggleCalendar(cal.href)}
                      />
                      <span
                        className="ll-calendar-dot"
                        style={{ background: cal.color ?? 'var(--ll-accent)' }}
                      />
                      <span>
                        {cal.name}
                        {cal.supportsVtodo && getKindForCalendar(cal) === 'events' && (
                          <em className="ll-calendar-hint">{t('settings.caldavModal.mayContainReminders')}</em>
                        )}
                      </span>
                    </label>
                    <select
                      className="ll-calendar-kind-select"
                      value={getKindForCalendar(cal)}
                      disabled={!selectedHrefs.has(cal.href)}
                      onChange={(e) => setCalendarKind(cal.href, e.target.value as CalDavCalendarKind)}
                      title={t('settings.caldavModal.importType')}
                    >
                      <option value="events">{t('settings.caldavModal.importEvents')}</option>
                      <option value="reminders">{t('settings.caldavModal.importReminders')}</option>
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="ll-form-row">
          <label className="ll-toggle block">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            {t('settings.caldavModal.accountActive')}
          </label>
          <label className="ll-toggle block">
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            {t('settings.caldavModal.syncOnStart')}
          </label>
        </div>

        {status && (
          <p className={`ll-form-status${statusIsError ? ' error' : ''}`}>{status}</p>
        )}

        <div className="ll-form-actions">
          <div className="ll-form-actions-right">
            <button type="button" className="ll-btn ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="button" className="ll-btn primary" disabled={isLoading} onClick={save}>
              {t('settings.caldavModal.saveAndSync')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
