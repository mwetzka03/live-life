import { useMemo, useState } from 'react';
import { Check, CheckCircle2, Edit3, Flame, Layers, Plus, Trash2, Undo2 } from 'lucide-react';
import type { CalendarEvent, Challenge, ChallengeGroup } from '../../domain/models/AppData';
import { DateUtils } from '../../domain/services/DateUtils';
import { StreakMultiplier } from '../../domain/services/StreakMultiplier';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { AppIcon } from '../common/AppIcon';
import { AcceptReminderModal, ReminderSuggestions } from './ReminderSuggestions';
import { ChallengeGroupCard, ChallengeGroupModal, GroupDetailModal } from './ChallengeGroupModal';
import { ChallengeModal } from './ChallengeModal';
import { PageHeader } from '../common/InfoTip';
import { FitPager } from '../common/FitPager';
import { useFitGridPagination } from '../../hooks/useFitGridPagination';
import { useChallengeComplete } from '../../lib/challengeComplete/ChallengeCompleteProvider';

type ChallengeTab = 'active' | 'completed';
type ChallengeViewFilter = 'all' | 'groups' | 'single';

type ChallengeGridItem =
  | { type: 'group'; id: string }
  | { type: 'challenge'; id: string };

function isCompletedOneTime(challenge: Challenge, hasAnyCompletion: (id: string) => boolean): boolean {
  return challenge.recurrence === 'none' && hasAnyCompletion(challenge.id);
}

interface ChallengeCardProps {
  challenge: Challenge;
  completed?: boolean;
  onEdit: (id: string) => void;
}

function ChallengeCard({ challenge, completed = false, onEdit }: ChallengeCardProps) {
  const { app } = useAppState();
  const { t, dict, locale } = useLocale();
  const { requestComplete } = useChallengeComplete();
  const streak = app.challenges.getStreak(challenge.id);
  const multiplier = StreakMultiplier.fromStreak(streak + 1);
  const projected = app.challenges.getProjectedReward(challenge, DateUtils.today());
  const totalDone = app.challenges.getCompletionsForChallenge(challenge.id).length;
  const completion = app.challenges.getCompletionsForChallenge(challenge.id).at(-1);

  const handleUncomplete = () => {
    if (!completion) return;
    void app.uncompleteChallenge(challenge.id, completion.date);
  };

  const handleComplete = () => {
    requestComplete(challenge.id);
  };

  return (
    <article
      className={`ll-card${completed ? ' ll-card-completed' : ''}`}
      style={{ borderTopColor: challenge.color }}
    >
      <div className="ll-card-icon" style={{ background: `${challenge.color}22`, color: challenge.color }}>
        <AppIcon name={challenge.icon} size={22} color={challenge.color} />
      </div>
      <div className="ll-card-body">
        <h3 lang={locale}>{challenge.title}</h3>
        {challenge.description && <p lang={locale}>{challenge.description}</p>}
        <div className="ll-card-meta">
          <span>{dict.labels.categories[challenge.category]}</span>
          <span>{dict.labels.recurrence[challenge.recurrence]}</span>
          <span className="coin">
            {t('challenges.coinsReward', { amount: challenge.coinReward })}
            {!completed && multiplier > 1 && ` → ${projected.total} (${StreakMultiplier.format(multiplier)})`}
          </span>
        </div>
        <div className="ll-card-stats">
          {completed && completion ? (
            <>
              <span>
                <CheckCircle2 size={14} />{' '}
                {t('challenges.doneOn', { date: DateUtils.formatGerman(completion.date) })}
              </span>
              <span className="coin">
                {t('challenges.coinsEarned', { amount: completion.coinsEarned })}
              </span>
            </>
          ) : (
            <>
              <span>
                <Flame size={14} /> {t('challenges.streak', { count: streak })}
                {multiplier > 1 && ` · ${StreakMultiplier.format(multiplier)}`}
              </span>
              <span>
                <CheckCircle2 size={14} /> {t('challenges.timesDone', { count: totalDone })}
              </span>
              {(challenge.startTime || challenge.endTime) && (
                <span>
                  {DateUtils.formatTime(challenge.startTime)}
                  {challenge.endTime ? ` – ${DateUtils.formatTime(challenge.endTime)}` : ''}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="ll-card-actions column icons">
        {completed ? (
          <button
            type="button"
            className="ll-icon-btn"
            onClick={handleUncomplete}
            aria-label={t('challenges.reset')}
            title={t('challenges.reset')}
          >
            <Undo2 size={16} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className="ll-icon-btn primary"
            disabled={
              (challenge.recurrence === 'none' && app.challenges.hasAnyCompletion(challenge.id)) ||
              (challenge.recurrence !== 'irregular' &&
                challenge.recurrence !== 'none' &&
                app.challenges.isCompletedOn(challenge.id, DateUtils.today()))
            }
            onClick={handleComplete}
            aria-label={t('challenges.completeToday')}
            title={t('challenges.completeToday')}
          >
            <Check size={16} aria-hidden />
          </button>
        )}
        <button type="button" className="ll-icon-btn" onClick={() => onEdit(challenge.id)} aria-label={t('common.edit')}>
          <Edit3 size={16} />
        </button>
        <button
          type="button"
          className="ll-icon-btn danger"
          aria-label={t('common.delete')}
          onClick={() => {
            void app.deleteChallenge(challenge.id);
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

function isCompletedGroup(group: ChallengeGroup, hasAnyCompletion: (id: string) => boolean, getChallenges: (gid: string) => Challenge[]): boolean {
  const challenges = getChallenges(group.id);
  if (challenges.length === 0) return false;
  return challenges.every((c) => hasAnyCompletion(c.id));
}

export function ChallengePanel() {
  const { app } = useAppState();
  const { t } = useLocale();
  const challenges = app.challenges.getAll();
  const groups = app.challengeGroups.getAll();
  const [tab, setTab] = useState<ChallengeTab>('active');
  const [viewFilter, setViewFilter] = useState<ChallengeViewFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [acceptReminder, setAcceptReminder] = useState<CalendarEvent | null>(null);

  const { activeChallenges, completedOneTime, activeGroups, completedGroups } = useMemo(() => {
    const active: Challenge[] = [];
    const completed: Challenge[] = [];
    for (const ch of challenges) {
      if (ch.groupId) continue;
      if (isCompletedOneTime(ch, app.challenges.hasAnyCompletion.bind(app.challenges))) completed.push(ch);
      else active.push(ch);
    }
    const activeG: ChallengeGroup[] = [];
    const completedG: ChallengeGroup[] = [];
    for (const g of groups) {
      if (
        isCompletedGroup(
          g,
          app.challenges.hasAnyCompletion.bind(app.challenges),
          app.challengeGroups.getChallengesForGroup.bind(app.challengeGroups),
        )
      ) {
        completedG.push(g);
      } else {
        activeG.push(g);
      }
    }
    return {
      activeChallenges: active,
      completedOneTime: completed,
      activeGroups: activeG,
      completedGroups: completedG,
    };
  }, [challenges, groups, app.challenges, app.challengeGroups]);

  const visibleChallenges = tab === 'active' ? activeChallenges : completedOneTime;
  const visibleGroups = tab === 'active' ? activeGroups : completedGroups;

  const gridItems = useMemo<ChallengeGridItem[]>(() => {
    const groupItems = visibleGroups.map((g) => ({ type: 'group' as const, id: g.id }));
    const challengeItems = visibleChallenges.map((c) => ({ type: 'challenge' as const, id: c.id }));
    if (viewFilter === 'groups') return groupItems;
    if (viewFilter === 'single') return challengeItems;
    return [...groupItems, ...challengeItems];
  }, [visibleGroups, visibleChallenges, viewFilter]);

  const { containerRef, page, setPage, pageCount, pageItems, showPager, gridStyle } = useFitGridPagination(
    gridItems,
    {
      fallbackCardHeight: 156,
      maxColumns: 5,
      getItemColumnSpan: (item) => (item.type === 'group' ? 2 : 1),
    },
  );

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setModalOpen(true);
  };

  return (
    <section className="ll-page ll-page-fit">
      <div className="ll-page-fit-header">
        <PageHeader
          title={t('challenges.title')}
          subtitle={t('challenges.subtitle')}
          info={t('help.challenges')}
          actions={
            <div className="ll-page-header-actions">
              <button
                type="button"
                className="ll-btn ghost"
                onClick={() => {
                  setEditingGroupId(null);
                  setGroupModalOpen(true);
                }}
              >
                <Layers size={16} /> {t('challenges.groups.add')}
              </button>
              <button type="button" className="ll-btn primary" onClick={openCreate}>
                <Plus size={16} /> {t('challenges.add')}
              </button>
            </div>
          }
        />
      </div>

      <div className="ll-page-fit-toolbar">
        <ReminderSuggestions onAccept={setAcceptReminder} />

        <div className="ll-challenge-toolbar-row">
          <div className="ll-challenge-tabs">
            <div className="ll-segment">
              <button
                type="button"
                className={tab === 'active' ? 'active' : ''}
                onClick={() => setTab('active')}
              >
                {t('challenges.tabActive')}
              </button>
              <button
                type="button"
                className={tab === 'completed' ? 'active' : ''}
                onClick={() => setTab('completed')}
              >
                {t('challenges.tabCompleted')}
                {completedOneTime.length + completedGroups.length > 0 && (
                  <span className="ll-tab-badge">
                    {completedOneTime.length + completedGroups.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="ll-segment ll-challenge-view-filter">
            <button
              type="button"
              className={viewFilter === 'all' ? 'active' : ''}
              onClick={() => setViewFilter('all')}
            >
              {t('challenges.viewAll')}
            </button>
            <button
              type="button"
              className={viewFilter === 'groups' ? 'active' : ''}
              onClick={() => setViewFilter('groups')}
            >
              {t('challenges.viewGroups')}
            </button>
            <button
              type="button"
              className={viewFilter === 'single' ? 'active' : ''}
              onClick={() => setViewFilter('single')}
            >
              {t('challenges.viewSingle')}
            </button>
          </div>
        </div>
      </div>

      <div className="ll-page-fit-body" ref={containerRef}>
        <div className="ll-card-grid ll-card-grid-fit" style={gridStyle}>
          {tab === 'completed' && gridItems.length === 0 && (
            <div className="ll-empty">
              <CheckCircle2 size={32} />
              <p>{t('challenges.emptyCompleted')}</p>
            </div>
          )}
          {tab === 'active' && gridItems.length === 0 && (
            <div className="ll-empty">
              <Flame size={32} />
              <p>{t('challenges.emptyActive')}</p>
            </div>
          )}
          {pageItems.map((item) =>
            item.type === 'group' ? (
              <ChallengeGroupCard
                key={`group-${item.id}`}
                group={app.challengeGroups.getById(item.id)!}
                completed={tab === 'completed'}
                onOpen={setDetailGroupId}
                onEdit={(id) => {
                  setEditingGroupId(id);
                  setGroupModalOpen(true);
                }}
              />
            ) : (
              <ChallengeCard
                key={`challenge-${item.id}`}
                challenge={app.challenges.getById(item.id)!}
                completed={tab === 'completed'}
                onEdit={openEdit}
              />
            ),
          )}
        </div>
      </div>

      {showPager && <FitPager page={page} pageCount={pageCount} onPageChange={setPage} />}

      <ChallengeModal open={modalOpen} challengeId={editingId} onClose={() => setModalOpen(false)} />
      <ChallengeGroupModal
        open={groupModalOpen}
        groupId={editingGroupId}
        onClose={() => setGroupModalOpen(false)}
      />
      <GroupDetailModal
        open={!!detailGroupId}
        groupId={detailGroupId}
        completed={tab === 'completed'}
        onClose={() => setDetailGroupId(null)}
        onEditGroup={(id) => {
          setDetailGroupId(null);
          setEditingGroupId(id);
          setGroupModalOpen(true);
        }}
        onEditChallenge={(id) => {
          setDetailGroupId(null);
          openEdit(id);
        }}
      />
      <AcceptReminderModal
        open={!!acceptReminder}
        event={acceptReminder}
        onClose={() => setAcceptReminder(null)}
      />
    </section>
  );
}
