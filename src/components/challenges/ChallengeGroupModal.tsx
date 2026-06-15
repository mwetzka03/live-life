import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, Layers, Link2, Plus, Trash2, X } from 'lucide-react';
import type { Challenge, ChallengeGroup } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { isTauriApp } from '../../domain/services/CalDavApi';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { getStoredAppleReminderListOptions } from '../../lib/appleReminderListOptions';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { AppIcon, ColorPicker, IconPicker } from '../common/AppIcon';
import { Modal } from '../common/Modal';

interface ChallengeGroupCardProps {
  group: ChallengeGroup;
  completed?: boolean;
  onEdit: (id: string) => void;
}

export function ChallengeGroupCard({ group, completed = false, onEdit }: ChallengeGroupCardProps) {
  const { app } = useAppState();
  const { runWithLoading } = useLoading();
  const { t } = useLocale();
  const challenges = app.challengeGroups.getChallengesForGroup(group.id);
  const progress = app.challengeGroups.getProgress(group.id, app.challenges.hasAnyCompletion.bind(app.challenges));

  return (
    <article
      className={`ll-card ll-group-card${completed ? ' ll-card-completed' : ''}`}
      style={{ borderTopColor: group.color }}
    >
      <div className="ll-card-icon" style={{ background: `${group.color}22`, color: group.color }}>
        <AppIcon name={group.icon} size={22} color={group.color} />
      </div>
      <div className="ll-card-body">
        <h3>
          <Layers size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
          {group.title}
        </h3>
        {group.description && <p>{group.description}</p>}
        <div className="ll-card-meta">
          <span>{t('challenges.groups.oneTime')}</span>
          <span>{DateUtils.formatGerman(group.startDate)}</span>
          <span>{t('challenges.groups.progress', { done: progress.done, total: progress.total })}</span>
        </div>
        <ul className="ll-group-challenge-list">
          {challenges.map((ch) => {
            const done = app.challenges.hasAnyCompletion(ch.id);
            return (
              <li key={ch.id} className={done ? 'done' : ''}>
                <AppIcon name={ch.icon} size={14} color={ch.color} />
                <span>{ch.title}</span>
                {!completed && (
                  <button
                    type="button"
                    className="ll-icon-btn small primary"
                    disabled={done}
                    onClick={() => {
                      void runWithLoading(
                        () => app.completeChallenge(ch.id, DateUtils.today()),
                        t('loading.challengeComplete'),
                      );
                    }}
                    aria-label={t('challenges.completeToday')}
                  >
                    <Check size={12} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="ll-card-actions">
        <button type="button" className="ll-icon-btn" onClick={() => onEdit(group.id)} aria-label={t('common.edit')}>
          <Edit3 size={16} />
        </button>
        <button
          type="button"
          className="ll-icon-btn danger"
          aria-label={t('common.delete')}
          onClick={() => {
            void runWithLoading(
              () => app.deleteChallengeGroup(group.id),
              t('loading.challengeDelete'),
            );
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

interface ChallengeGroupModalProps {
  open: boolean;
  groupId: string | null;
  onClose: () => void;
}

export function ChallengeGroupModal({ open, groupId, onClose }: ChallengeGroupModalProps) {
  const { app } = useAppState();
  const { runWithLoading } = useLoading();
  const { t } = useLocale();
  const existing = groupId ? app.challengeGroups.getById(groupId) : undefined;
  const hasAppleAccounts = app.appleRemindersAccounts.getAll().some((a) => a.enabled);

  const icloudListOptions = useMemo(() => {
    if (!open || !isTauriApp() || !hasAppleAccounts) return [];
    return getStoredAppleReminderListOptions(app.appleRemindersAccounts.getAll());
  }, [open, hasAppleAccounts, app]);

  const [challengeIds, setChallengeIds] = useState<string[]>([]);
  const [linkPick, setLinkPick] = useState('');
  const [newChallengeTitle, setNewChallengeTitle] = useState('');
  const [icloudListKey, setIcloudListKey] = useState('');
  const [saveError, setSaveError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('layers');
  const [color, setColor] = useState('#6366f1');
  const [startDate, setStartDate] = useState(DateUtils.today());
  const [startTime, setStartTime] = useState('');

  const linkableChallenges = useMemo(() => {
    return app.challenges
      .getAll()
      .filter(
        (c) =>
          c.recurrence === 'none' &&
          (!c.groupId || c.groupId === groupId) &&
          !challengeIds.includes(c.id),
      );
  }, [app, groupId, challengeIds]);

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setDescription(existing?.description ?? '');
    setIcon(existing?.icon ?? 'layers');
    setColor(existing?.color ?? '#6366f1');
    setStartDate(existing?.startDate ?? DateUtils.today());
    setStartTime(existing?.startTime ?? '');
    setChallengeIds(existing?.challengeIds ?? []);
    setIcloudListKey(existing?.icloudReminderSourceId ?? '');
    setLinkPick('');
    setNewChallengeTitle('');
    setSaveError('');
  }, [open, existing]);

  const linkedChallenges = challengeIds
    .map((id) => app.challenges.getById(id))
    .filter((c): c is Challenge => !!c);

  const addLinked = () => {
    if (!linkPick || challengeIds.includes(linkPick)) return;
    setChallengeIds((prev) => [...prev, linkPick]);
    setLinkPick('');
  };

  const createAndAdd = () => {
    if (!newChallengeTitle.trim()) return;
    const created = app.createChallenge({
      title: newChallengeTitle.trim(),
      icon: 'target',
      color: '#8b5cf6',
      category: 'todo',
      coinReward: 10,
      recurrence: 'none',
      startDate,
      startTime: startTime || undefined,
    });
    setChallengeIds((prev) => [...prev, created.id]);
    setNewChallengeTitle('');
  };

  const removeLinked = (id: string) => {
    setChallengeIds((prev) => prev.filter((cid) => cid !== id));
  };

  const save = () => {
    if (!title.trim()) return;
    void runWithLoading(async () => {
      setSaveError('');
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        challengeIds,
        startDate,
        startTime: startTime || undefined,
      };

      let savedId = groupId;
      if (groupId) {
        app.updateChallengeGroup(groupId, payload);
      } else {
        const created = app.createChallengeGroup(payload);
        savedId = created.id;
      }

      const shouldCreateICloud =
        isTauriApp() &&
        icloudListKey &&
        savedId &&
        (!existing?.icloudSubtaskHrefs || icloudListKey !== existing?.icloudReminderSourceId);

      if (shouldCreateICloud && savedId) {
        app.queueCreateChallengeGroupICloudReminder(savedId, icloudListKey);
      }

      onClose();
    }, t('loading.challengeSave')).catch((error) => {
      setSaveError(error instanceof Error ? error.message : t('common.saveFailed'));
    });
  };

  const remove = () => {
    if (!groupId) return;
    void runWithLoading(async () => {
      await app.deleteChallengeGroup(groupId);
      onClose();
    }, t('loading.challengeDelete'));
  };

  return (
    <Modal
      open={open}
      title={groupId ? t('challenges.groups.editTitle') : t('challenges.groups.newTitle')}
      onClose={onClose}
      wide
    >
      <div className="ll-form">
        <label>
          {t('common.title')}
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          {t('common.description')}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <div className="ll-form-row">
          <label>
            {t('challenges.modal.date')}
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            {t('challenges.modal.timeFrom')}
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
        </div>

        <div className="ll-group-link-section">
          <h4>{t('challenges.groups.linkedChallenges')}</h4>
          {linkedChallenges.length === 0 && (
            <p className="ll-form-hint">{t('challenges.groups.noLinked')}</p>
          )}
          <ul className="ll-group-link-list">
            {linkedChallenges.map((ch) => (
              <li key={ch.id}>
                <AppIcon name={ch.icon} size={16} color={ch.color} />
                <span>{ch.title}</span>
                <button type="button" className="ll-icon-btn small" onClick={() => removeLinked(ch.id)}>
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
          <div className="ll-form-row">
            <label className="ll-grow">
              {t('challenges.groups.linkExisting')}
              <select value={linkPick} onChange={(e) => setLinkPick(e.target.value)}>
                <option value="">{t('common.noneOption')}</option>
                {linkableChallenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="ll-btn ghost" onClick={addLinked} disabled={!linkPick}>
              <Link2 size={14} /> {t('challenges.groups.link')}
            </button>
          </div>
          <div className="ll-form-row">
            <label className="ll-grow">
              {t('challenges.groups.createNew')}
              <input
                value={newChallengeTitle}
                onChange={(e) => setNewChallengeTitle(e.target.value)}
                placeholder={t('challenges.modal.titlePlaceholder')}
              />
            </label>
            <button type="button" className="ll-btn ghost" onClick={createAndAdd} disabled={!newChallengeTitle.trim()}>
              <Plus size={14} /> {t('common.add')}
            </button>
          </div>
        </div>

        {isTauriApp() && hasAppleAccounts && (
          <label>
            {t('challenges.groups.appleReminder')}
            <select
              value={icloudListKey}
              onChange={(e) => setIcloudListKey(e.target.value)}
              disabled={!!existing?.icloudReminderHref}
            >
              <option value="">{t('common.noneOption')}</option>
              {icloudListOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {icloudListKey && (
          <p className="ll-form-hint">{t('challenges.groups.icloudSubtasksHint')}</p>
        )}
        {saveError && <p className="ll-form-hint error-text">{saveError}</p>}

        <label>{t('common.icon')}</label>
        <IconPicker value={icon} onChange={setIcon} />
        <label>{t('common.color')}</label>
        <ColorPicker value={color} onChange={setColor} />

        <div className="ll-form-actions">
          {groupId && (
            <button type="button" className="ll-btn danger" onClick={remove}>
              <Trash2 size={16} /> {t('common.delete')}
            </button>
          )}
          <div className="ll-form-actions-right">
            <button type="button" className="ll-btn ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="button" className="ll-btn primary" onClick={save}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
