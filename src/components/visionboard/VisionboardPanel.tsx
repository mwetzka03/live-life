import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Edit3, ListChecks, Plus, Trash2 } from 'lucide-react';
import type { BucketlistItem } from '../../domain/models/AppData';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { AppIcon, ColorPicker, IconPicker } from '../common/AppIcon';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/InfoTip';
import { FitPager } from '../common/FitPager';
import { VisionBoardCanvas, VisionBoardSelector } from './VisionBoardCanvas';

const UNKNOWN_YEAR = 'unknown';
const BUCKETLIST_CARD_GAP_PX = 9;
const BUCKETLIST_PAGER_HEIGHT_PX = 44;
const BUCKETLIST_CARD_FALLBACK_PX = 96;

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
  const [shopEnabled, setShopEnabled] = useState(false);
  const [shopPrice, setShopPrice] = useState(100);

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
    setShopEnabled(!!existing?.shopItemId);
    const shopItem = existing?.shopItemId ? app.shop.getById(existing.shopItemId) : undefined;
    setShopPrice(shopItem?.price ?? 100);
  }, [open, existing, app]);

  const save = () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      targetYear: yearMode === UNKNOWN_YEAR ? null : targetYear,
    };
    let savedId = itemId;
    if (itemId) app.updateBucketlistItem(itemId, payload);
    else {
      const created = app.createBucketlistItem(payload);
      savedId = created.id;
    }
    if (savedId) {
      app.linkBucketlistToShop(savedId, { enabled: shopEnabled, price: shopPrice });
    }
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
        <div className="ll-form-row ll-shop-link-row">
          <label className="ll-checkbox-label">
            <input
              type="checkbox"
              checked={shopEnabled}
              onChange={(e) => setShopEnabled(e.target.checked)}
            />
            {t('bucketlist.modal.addToShop')}
          </label>
          {shopEnabled && (
            <label>
              {t('shop.priceLabel')}
              <input
                type="number"
                min={1}
                value={shopPrice}
                onChange={(e) => setShopPrice(Number(e.target.value))}
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

function BucketlistSidebarCard({ item, onEdit }: { item: BucketlistItem; onEdit: (id: string) => void }) {
  const { app } = useAppState();
  const { t } = useLocale();

  const yearLabel =
    item.targetYear === null ? t('bucketlist.unknownTime') : String(item.targetYear);

  return (
    <article className={`ll-bucketlist-sidebar-card${item.completed ? ' completed' : ''}`}>
      <div className="ll-bucketlist-sidebar-top">
        <div className="ll-bucketlist-sidebar-icon" style={{ color: item.color }}>
          <AppIcon name={item.icon} size={20} color={item.color} />
        </div>
        <div className="ll-bucketlist-sidebar-body">
          <strong>{item.title}</strong>
          <div className="ll-bucketlist-sidebar-meta">
            <span>{yearLabel}</span>
            {item.shopItemId && <span className="ll-shop-badge">{t('bucketlist.inShop')}</span>}
          </div>
        </div>
      </div>
      <div className="ll-bucketlist-sidebar-actions">
        <button
          type="button"
          className="ll-btn ghost small"
          onClick={() => app.toggleBucketlistItem(item.id)}
        >
          {item.completed ? <Circle size={14} /> : <CheckCircle2 size={14} />}
          {item.completed ? t('bucketlist.open') : t('bucketlist.done')}
        </button>
        <button type="button" className="ll-btn ghost small" onClick={() => onEdit(item.id)}>
          <Edit3 size={14} /> {t('common.edit')}
        </button>
      </div>
    </article>
  );
}

function useBucketlistPageSize(itemCount: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(3);

  useLayoutEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const measure = () => {
      const height = container.clientHeight;
      if (height <= 0) return;

      const sample = container.querySelector('.ll-bucketlist-sidebar-card') as HTMLElement | null;
      const cardHeight =
        (sample?.offsetHeight ?? BUCKETLIST_CARD_FALLBACK_PX) + BUCKETLIST_CARD_GAP_PX;
      const probePager = itemCount > 1;
      const pagerHeight = probePager ? BUCKETLIST_PAGER_HEIGHT_PX : 0;
      const fit = Math.max(1, Math.floor((height - pagerHeight) / cardHeight));
      setPageSize((prev) => (prev === fit ? prev : fit));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [itemCount]);

  return { listRef, pageSize };
}

export function VisionboardPanel() {
  const { app } = useAppState();
  const { t } = useLocale();
  const items = app.bucketlist.getAll();
  const board = app.visionBoards.getActive();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bucketPage, setBucketPage] = useState(0);
  const { listRef, pageSize } = useBucketlistPageSize(items.length);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(bucketPage, pageCount - 1);
  const pageItems = items.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );
  const showPager = items.length > pageSize;

  useEffect(() => {
    setBucketPage((page) => Math.min(page, Math.max(0, pageCount - 1)));
  }, [items.length, pageCount]);

  return (
    <section className="ll-page ll-page-fit ll-visionboard-page">
      <PageHeader
        title={t('visionboard.title')}
        subtitle={t('visionboard.subtitle')}
        info={t('help.visionboard')}
      />

      <div className="ll-visionboard-layout">
        <aside className="ll-visionboard-bucketlist">
          <div className="ll-visionboard-bucketlist-header">
            <h2>{t('bucketlist.title')}</h2>
            <button
              type="button"
              className="ll-btn primary small"
              onClick={() => {
                setEditingId(null);
                setModalOpen(true);
              }}
            >
              <Plus size={14} /> {t('bucketlist.add')}
            </button>
          </div>
          <div className="ll-visionboard-bucketlist-scroll" ref={listRef}>
            {items.length === 0 && (
              <div className="ll-empty compact">
                <ListChecks size={24} />
                <p>{t('bucketlist.empty')}</p>
              </div>
            )}
            {pageItems.map((item) => (
              <BucketlistSidebarCard
                key={item.id}
                item={item}
                onEdit={(id) => {
                  setEditingId(id);
                  setModalOpen(true);
                }}
              />
            ))}
          </div>
          {showPager && (
            <FitPager className="ll-fit-pager-compact" page={safePage} pageCount={pageCount} onPageChange={setBucketPage} />
          )}
        </aside>

        <div className="ll-visionboard-main">
          <VisionBoardSelector />
          {board && <VisionBoardCanvas board={board} />}
        </div>
      </div>

      <BucketlistModal open={modalOpen} itemId={editingId} onClose={() => setModalOpen(false)} />
    </section>
  );
}
