import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Edit3, ListChecks, Plus, Trash2 } from 'lucide-react';
import type { BucketlistItem } from '../../domain/models/AppData';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { AppIcon, ColorPicker, IconPicker } from '../common/AppIcon';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/InfoTip';

const UNKNOWN_YEAR = 'unknown';

interface BucketlistModalProps {
  open: boolean;
  itemId: string | null;
  onClose: () => void;
}

function BucketlistModal({ open, itemId, onClose }: BucketlistModalProps) {
  const { app } = useAppState();
  const { t } = useLocale();
  const existing = itemId ? app.bucketlist.getById(itemId) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('rocket');
  const [color, setColor] = useState('#6366f1');
  const [yearMode, setYearMode] = useState<string>(UNKNOWN_YEAR);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1);

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setDescription(existing?.description ?? '');
    setIcon(existing?.icon ?? 'rocket');
    setColor(existing?.color ?? '#6366f1');
    if (existing?.targetYear === null || existing?.targetYear === undefined) {
      setYearMode(UNKNOWN_YEAR);
      setTargetYear(new Date().getFullYear() + 1);
    } else {
      setYearMode('year');
      setTargetYear(existing.targetYear);
    }
  }, [open, existing]);

  const save = () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      targetYear: yearMode === UNKNOWN_YEAR ? null : targetYear,
    };
    if (itemId) app.updateBucketlistItem(itemId, payload);
    else app.createBucketlistItem(payload);
    onClose();
  };

  const remove = () => {
    if (itemId) app.deleteBucketlistItem(itemId);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={itemId ? t('bucketlist.modal.editTitle') : t('bucketlist.modal.newTitle')}
      onClose={onClose}
    >
      <div className="ll-form">
        <label>
          {t('common.title')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('bucketlist.modal.titlePlaceholder')}
          />
        </label>
        <label>
          {t('common.description')}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <div className="ll-form-row">
          <label>
            {t('bucketlist.modal.period')}
            <select value={yearMode} onChange={(e) => setYearMode(e.target.value)}>
              <option value={UNKNOWN_YEAR}>{t('bucketlist.unknownTime')}</option>
              <option value="year">{t('bucketlist.modal.specificYear')}</option>
            </select>
          </label>
          {yearMode === 'year' && (
            <label>
              {t('bucketlist.modal.year')}
              <input
                type="number"
                min={1900}
                max={2100}
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
              />
            </label>
          )}
        </div>
        <label>{t('common.icon')}</label>
        <IconPicker value={icon} onChange={setIcon} />
        <label>{t('common.color')}</label>
        <ColorPicker value={color} onChange={setColor} />
        <div className="ll-form-actions">
          {itemId && (
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

function BucketlistCard({ item, onEdit }: { item: BucketlistItem; onEdit: (id: string) => void }) {
  const { app } = useAppState();
  const { t, locale } = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';

  const yearLabel = (year: number | null) =>
    year === null ? t('bucketlist.unknownTime') : String(year);

  return (
    <article
      className={`ll-card${item.completed ? ' ll-card-completed' : ''}`}
      style={{ borderTopColor: item.color }}
    >
      <div className="ll-card-icon" style={{ background: `${item.color}22`, color: item.color }}>
        <AppIcon name={item.icon} size={22} color={item.color} />
      </div>
      <div className="ll-card-body">
        <h3>{item.title}</h3>
        {item.description && <p>{item.description}</p>}
        <div className="ll-card-meta">
          <span>{yearLabel(item.targetYear)}</span>
          {item.completed && item.completedAt && (
            <span>
              {t('bucketlist.doneOn', {
                date: new Date(item.completedAt).toLocaleDateString(dateLocale),
              })}
            </span>
          )}
        </div>
      </div>
      <div className="ll-card-actions">
        <button
          type="button"
          className={`ll-icon-btn${item.completed ? '' : ' primary'}`}
          onClick={() => app.toggleBucketlistItem(item.id)}
          aria-label={item.completed ? t('bucketlist.open') : t('bucketlist.done')}
          title={item.completed ? t('bucketlist.open') : t('bucketlist.done')}
        >
          {item.completed ? <Circle size={16} /> : <CheckCircle2 size={16} />}
        </button>
        <button type="button" className="ll-icon-btn" onClick={() => onEdit(item.id)} aria-label={t('common.edit')}>
          <Edit3 size={16} />
        </button>
        <button
          type="button"
          className="ll-icon-btn danger"
          onClick={() => app.deleteBucketlistItem(item.id)}
          aria-label={t('common.delete')}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

export function BucketlistPanel() {
  const { app } = useAppState();
  const { t } = useLocale();
  const items = app.bucketlist.getAll();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>('all');

  const yearLabel = (year: number | null) =>
    year === null ? t('bucketlist.unknownTime') : String(year);

  const years = useMemo(() => app.bucketlist.getYears(), [app, items]);

  const filtered = useMemo(() => {
    if (filterYear === 'all') return items;
    if (filterYear === UNKNOWN_YEAR) return items.filter((i) => i.targetYear === null);
    return items.filter((i) => i.targetYear === Number(filterYear));
  }, [items, filterYear]);

  const grouped = useMemo(() => {
    const map = new Map<string, BucketlistItem[]>();
    for (const item of filtered) {
      const key = item.targetYear === null ? UNKNOWN_YEAR : String(item.targetYear);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === UNKNOWN_YEAR) return 1;
      if (b === UNKNOWN_YEAR) return -1;
      return Number(a) - Number(b);
    });
  }, [filtered]);

  const openCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  return (
    <section className="ll-page">
      <PageHeader
        title={t('bucketlist.title')}
        subtitle={t('bucketlist.subtitle')}
        info={t('help.bucketlist')}
        actions={
          <button type="button" className="ll-btn primary" onClick={openCreate}>
            <Plus size={16} /> {t('bucketlist.add')}
          </button>
        }
      />

      {years.length > 0 && (
        <div className="ll-bucketlist-filters">
          <button
            type="button"
            className={`ll-btn small${filterYear === 'all' ? ' primary' : ''}`}
            onClick={() => setFilterYear('all')}
          >
            {t('bucketlist.filterAll')}
          </button>
          {years.map((year) => (
            <button
              key={year === null ? UNKNOWN_YEAR : year}
              type="button"
              className={`ll-btn small${filterYear === (year === null ? UNKNOWN_YEAR : String(year)) ? ' primary' : ''}`}
              onClick={() => setFilterYear(year === null ? UNKNOWN_YEAR : String(year))}
            >
              {yearLabel(year)}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="ll-empty">
          <ListChecks size={32} />
          <p>{t('bucketlist.empty')}</p>
        </div>
      )}

      {grouped.map(([yearKey, groupItems]) => (
        <section key={yearKey} className="ll-bucketlist-year-group">
          <h2>{yearKey === UNKNOWN_YEAR ? t('bucketlist.unknownTime') : yearKey}</h2>
          <div className="ll-card-grid">
            {groupItems.map((item) => (
              <BucketlistCard
                key={item.id}
                item={item}
                onEdit={(id) => {
                  setEditingId(id);
                  setModalOpen(true);
                }}
              />
            ))}
          </div>
        </section>
      ))}

      <BucketlistModal open={modalOpen} itemId={editingId} onClose={() => setModalOpen(false)} />
    </section>
  );
}
