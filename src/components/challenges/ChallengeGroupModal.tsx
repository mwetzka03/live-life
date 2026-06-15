import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Edit3, Layers, Link2, Plus, Trash2, Undo2, X } from 'lucide-react';
import type { Challenge, ChallengeGroup } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { AppIcon, ColorPicker, IconPicker } from '../common/AppIcon';
import { Modal } from '../common/Modal';
import { ChallengeModal } from './ChallengeModal';
import { useChallengeComplete } from '../../lib/challengeComplete/ChallengeCompleteProvider';

function groupCoinTotal(
  challenges: Challenge[],
  completed: boolean,
  getCompletions: (id: string) => ReturnType<ReturnType<typeof useAppState>['app']['challenges']['getCompletionsForChallenge']>,
): number {
  if (completed) {
    return challenges.reduce((sum, ch) => {
      const last = getCompletions(ch.id).at(-1);
      return sum + (last?.coinsEarned ?? 0);
    }, 0);
  }
  return challenges.reduce((sum, ch) => sum + ch.coinReward, 0);
}

interface ChallengeGroupCardProps {
  group: ChallengeGroup;
  completed?: boolean;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}

export function ChallengeGroupCard({ group, completed = false, onOpen, onEdit }: ChallengeGroupCardProps) {
  const { app } = useAppState();
  const { t, locale } = useLocale();
  const { requestComplete } = useChallengeComplete();
  const challenges = app.challengeGroups.getChallengesForGroup(group.id);
  const progress = app.challengeGroups.getProgress(group.id, app.challenges.hasAnyCompletion.bind(app.challenges));
  const totalCoins = groupCoinTotal(
    challenges,
    completed,
    app.challenges.getCompletionsForChallenge.bind(app.challenges),
  );

  return (
    <article
      className={`ll-card ll-group-card ll-card-wide${completed ? ' ll-card-completed' : ''}`}
      style={{ borderTopColor: group.color }}
    >
      <button
        type="button"
        className="ll-group-card-open"
        onClick={() => onOpen(group.id)}
        aria-label={t('challenges.groups.openDetails')}
      >
        <div className="ll-card-icon" style={{ background: `${group.color}22`, color: group.color }}>
          <AppIcon name={group.icon} size={22} color={group.color} />
        </div>
        <div className="ll-card-body">
          <h3 lang={locale}>
            <Layers size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
            {group.title}
          </h3>
          {group.description && <p lang={locale}>{group.description}</p>}
          <div className="ll-card-meta">
            <span>{t('challenges.groups.oneTime')}</span>
            {group.startDate && <span>{DateUtils.formatGerman(group.startDate)}</span>}
            <span>{t('challenges.groups.progress', { done: progress.done, total: progress.total })}</span>
            <span className="coin">
              {completed
                ? t('challenges.coinsEarned', { amount: totalCoins })
                : t('challenges.groups.totalCoins', { amount: totalCoins })}
            </span>
          </div>
          <ul className="ll-group-challenge-list">
            {challenges.map((ch) => {
              const done = app.challenges.hasAnyCompletion(ch.id);
              const completion = app.challenges.getCompletionsForChallenge(ch.id).at(-1);
              return (
                <li key={ch.id} className={done ? 'done' : ''}>
                  <AppIcon name={group.icon} size={14} color={group.color} />
                  <span>{ch.title}</span>
                  <span className="ll-group-challenge-coins coin">
                    {done && completion
                      ? `+${completion.coinsEarned}`
                      : t('challenges.coinsReward', { amount: ch.coinReward })}
                  </span>
                  {(done || !completed) && (
                    <button
                      type="button"
                      className={`ll-icon-btn small${done ? '' : ' primary'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (done && completion) {
                          void app.uncompleteChallenge(ch.id, completion.date);
                        } else {
                          requestComplete(ch.id);
                        }
                      }}
                      aria-label={done ? t('challenges.reset') : t('challenges.completeToday')}
                    >
                      {done ? <Undo2 size={12} /> : <Check size={12} />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </button>
      <div className="ll-card-actions icons">
        <button
          type="button"
          className="ll-icon-btn"
          onClick={() => onEdit(group.id)}
          aria-label={t('common.edit')}
        >
          <Edit3 size={16} />
        </button>
        <button
          type="button"
          className="ll-icon-btn danger"
          aria-label={t('challenges.groups.dissolve')}
          title={t('challenges.groups.dissolve')}
          onClick={() => {
            void app.deleteChallengeGroup(group.id);
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

interface GroupDetailModalProps {
  open: boolean;
  groupId: string | null;
  completed?: boolean;
  onClose: () => void;
  onEditGroup: (id: string) => void;
  onEditChallenge: (id: string) => void;
}

export function GroupDetailModal({
  open,
  groupId,
  completed = false,
  onClose,
  onEditGroup,
  onEditChallenge,
}: GroupDetailModalProps) {
  const { app } = useAppState();
  const { t, locale } = useLocale();
  const { requestComplete } = useChallengeComplete();
  const group = groupId ? app.challengeGroups.getById(groupId) : undefined;
  const challenges = group ? app.challengeGroups.getChallengesForGroup(group.id) : [];
  const progress = group
    ? app.challengeGroups.getProgress(group.id, app.challenges.hasAnyCompletion.bind(app.challenges))
    : { done: 0, total: 0 };
  const totalCoins = groupCoinTotal(
    challenges,
    completed,
    app.challenges.getCompletionsForChallenge.bind(app.challenges),
  );

  if (!group) return null;

  return (
    <Modal open={open} title={group.title} onClose={onClose} wide>
      <div className="ll-form ll-group-detail">
        <div className="ll-group-detail-header">
          <div className="ll-card-icon" style={{ background: `${group.color}22`, color: group.color }}>
            <AppIcon name={group.icon} size={28} color={group.color} />
          </div>
          <div>
            {group.description && <p lang={locale}>{group.description}</p>}
            <div className="ll-card-meta">
              {group.startDate && <span>{DateUtils.formatGerman(group.startDate)}</span>}
              <span>{t('challenges.groups.progress', { done: progress.done, total: progress.total })}</span>
              <span className="coin">
                {completed
                  ? t('challenges.coinsEarned', { amount: totalCoins })
                  : t('challenges.groups.totalCoins', { amount: totalCoins })}
              </span>
            </div>
          </div>
          <button type="button" className="ll-btn ghost small" onClick={() => onEditGroup(group.id)}>
            <Edit3 size={14} /> {t('challenges.groups.editGroup')}
          </button>
        </div>

        <h4>{t('challenges.groups.linkedChallenges')}</h4>
        <ul className="ll-group-detail-list">
          {challenges.map((ch) => {
            const done = app.challenges.hasAnyCompletion(ch.id);
            const completion = app.challenges.getCompletionsForChallenge(ch.id).at(-1);
            return (
              <li key={ch.id} className={done ? 'done' : ''} style={{ borderColor: group.color }}>
                <AppIcon name={group.icon} size={18} color={group.color} />
                <div className="ll-group-detail-item-body">
                  <strong>{ch.title}</strong>
                  {ch.description && <p>{ch.description}</p>}
                  <div className="ll-group-detail-meta">
                    {ch.startDate && <span>{DateUtils.formatGerman(ch.startDate)}</span>}
                    {(ch.startTime || ch.endTime) && (
                      <span>
                        {DateUtils.formatTime(ch.startTime)}
                        {ch.endTime ? ` – ${DateUtils.formatTime(ch.endTime)}` : ''}
                      </span>
                    )}
                    <span className="coin">
                      {done && completion
                        ? t('challenges.coinsEarned', { amount: completion.coinsEarned })
                        : t('challenges.coinsReward', { amount: ch.coinReward })}
                    </span>
                    {done && completion && (
                      <span>
                        <CheckCircle2 size={12} /> {DateUtils.formatGerman(completion.date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ll-group-detail-actions">
                  {(done || !completed) && (
                    <button
                      type="button"
                      className={`ll-icon-btn small${done ? '' : ' primary'}`}
                      onClick={() => {
                        if (done && completion) {
                          void app.uncompleteChallenge(ch.id, completion.date);
                        } else {
                          requestComplete(ch.id);
                        }
                      }}
                      aria-label={done ? t('challenges.reset') : t('challenges.completeToday')}
                    >
                      {done ? <Undo2 size={14} /> : <Check size={14} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className="ll-icon-btn small"
                    onClick={() => onEditChallenge(ch.id)}
                    aria-label={t('common.edit')}
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}

interface ChallengeGroupModalProps {
  open: boolean;
  groupId: string | null;
  onClose: () => void;
}

export function ChallengeGroupModal({ open, groupId, onClose }: ChallengeGroupModalProps) {
  const { app } = useAppState();
  const { t } = useLocale();
  const existing = groupId ? app.challengeGroups.getById(groupId) : undefined;

  const [challengeIds, setChallengeIds] = useState<string[]>([]);
  const [linkPick, setLinkPick] = useState('');
  const [saveError, setSaveError] = useState('');
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('layers');
  const [color, setColor] = useState('#6366f1');
  const [startDate, setStartDate] = useState('');
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
    setStartDate(existing?.startDate ?? '');
    setStartTime(existing?.startTime ?? '');
    setChallengeIds(existing?.challengeIds ?? []);
    setLinkPick('');
    setSaveError('');
    setChallengeModalOpen(false);
  }, [open, existing]);

  const linkedChallenges = challengeIds
    .map((id) => app.challenges.getById(id))
    .filter((c): c is Challenge => !!c);

  const addLinked = () => {
    if (!linkPick || challengeIds.includes(linkPick)) return;
    setChallengeIds((prev) => [...prev, linkPick]);
    setLinkPick('');
  };

  const onChallengeCreated = (id: string) => {
    setChallengeIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeLinked = (id: string) => {
    setChallengeIds((prev) => prev.filter((cid) => cid !== id));
  };

  const save = () => {
    if (!title.trim()) return;
    setSaveError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        challengeIds,
        startDate: startDate || undefined,
        startTime: startTime || undefined,
      };

      if (groupId) {
        app.updateChallengeGroup(groupId, payload);
      } else {
        app.createChallengeGroup(payload);
      }

      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t('common.saveFailed'));
    }
  };

  const remove = () => {
    if (!groupId) return;
    void app.deleteChallengeGroup(groupId);
    onClose();
  };

  return (
    <>
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
              {t('challenges.modal.date')} ({t('common.optional')})
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
                  <AppIcon name={icon} size={16} color={color} />
                  <span>{ch.title}</span>
                  <span className="coin ll-group-challenge-coins">
                    {t('challenges.coinsReward', { amount: ch.coinReward })}
                  </span>
                  <button type="button" className="ll-icon-btn small" onClick={() => removeLinked(ch.id)}>
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="ll-group-link-row">
              <label className="ll-group-link-field">
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
              <button
                type="button"
                className="ll-btn ghost ll-group-link-action"
                onClick={addLinked}
                disabled={!linkPick}
              >
                <Link2 size={14} /> {t('challenges.groups.link')}
              </button>
            </div>

            <div className="ll-group-link-row ll-group-link-row-single">
              <button
                type="button"
                className="ll-btn ghost ll-group-link-action-full"
                onClick={() => setChallengeModalOpen(true)}
              >
                <Plus size={14} /> {t('challenges.groups.createNew')}
              </button>
            </div>
          </div>

          {saveError && <p className="ll-form-hint error-text">{saveError}</p>}

          <label>{t('common.icon')}</label>
          <IconPicker value={icon} onChange={setIcon} />
          <label>{t('common.color')}</label>
          <ColorPicker value={color} onChange={setColor} />

          <div className="ll-form-actions">
            {groupId && (
              <button type="button" className="ll-btn danger" onClick={remove}>
                <Trash2 size={16} /> {t('challenges.groups.dissolve')}
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

      <ChallengeModal
        open={challengeModalOpen}
        challengeId={null}
        onClose={() => setChallengeModalOpen(false)}
        oneTimeOnly
        hideGroupPicker
        presetGroupId={groupId ?? undefined}
        onCreated={onChallengeCreated}
      />
    </>
  );
}
