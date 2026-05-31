import { useEffect, useState } from 'react';
import { Coins, Edit3, ExternalLink, Gift, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { openExternalLink } from '../../lib/openExternalLink';
import { PageHeader } from '../common/InfoTip';
import { AppIcon, ColorPicker, IconPicker } from '../common/AppIcon';
import { Modal } from '../common/Modal';

export function ShopPanel() {
  const { app, balance } = useAppState();
  const { t } = useLocale();
  const items = app.shop.getItems();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const purchase = (id: string) => {
    const result = app.purchaseShopItem(id);
    if (result) setMessage(t('shop.purchased', { title: result.title }));
    else setMessage(t('shop.notEnoughCoins'));
    setTimeout(() => setMessage(''), 2500);
  };

  return (
    <section className="ll-page">
      <PageHeader
        title={t('shop.title')}
        subtitle={t('shop.subtitle')}
        info={t('help.shop')}
        actions={
          <div className="ll-page-header-actions">
            <div className="ll-balance-pill">
              <Coins size={16} />
              {t('shop.balanceAvailable', { balance })}
            </div>
            <button
              type="button"
              className="ll-btn primary"
              onClick={() => {
                setEditingId(null);
                setModalOpen(true);
              }}
            >
              <Plus size={16} /> {t('shop.addItem')}
            </button>
          </div>
        }
      />

      {message && <div className="ll-toast">{message}</div>}

      <div className="ll-card-grid shop">
        {items.length === 0 && (
          <div className="ll-empty">
            <ShoppingBag size={32} />
            <p>{t('shop.empty')}</p>
          </div>
        )}
        {items.map((item) => {
          const canBuy = balance >= item.price;
          return (
            <article key={item.id} className="ll-card shop-card" style={{ borderTopColor: item.color }}>
              <div className="ll-card-icon" style={{ background: `${item.color}22`, color: item.color }}>
                <AppIcon name={item.icon} size={24} color={item.color} />
              </div>
              <div className="ll-card-body">
                <h3>{item.title}</h3>
                {item.description && <p>{item.description}</p>}
                <div className="ll-price">
                  <Coins size={16} />
                  {t('shop.priceCoins', { price: item.price })}
                </div>
                {item.url && (
                  <button
                    type="button"
                    className="ll-btn ghost small"
                    onClick={() => openExternalLink(item.url!)}
                  >
                    <ExternalLink size={14} /> {t('shop.openLink')}
                  </button>
                )}
              </div>
              <div className="ll-card-actions column">
                <button
                  type="button"
                  className={`ll-btn primary${canBuy ? '' : ' disabled'}`}
                  disabled={!canBuy}
                  onClick={() => purchase(item.id)}
                >
                  <Gift size={16} /> {t('shop.buy')}
                </button>
                <div className="ll-inline-actions">
                  <button
                    type="button"
                    className="ll-icon-btn"
                    onClick={() => {
                      setEditingId(item.id);
                      setModalOpen(true);
                    }}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    className="ll-icon-btn danger"
                    onClick={() => app.deleteShopItem(item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ShopItemModal open={modalOpen} itemId={editingId} onClose={() => setModalOpen(false)} />
    </section>
  );
}

interface ShopItemModalProps {
  open: boolean;
  itemId: string | null;
  onClose: () => void;
}

function ShopItemModal({ open, itemId, onClose }: ShopItemModalProps) {
  const { app } = useAppState();
  const { t } = useLocale();
  const existing = itemId ? app.shop.getById(itemId) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState(50);
  const [icon, setIcon] = useState('gift');
  const [color, setColor] = useState('#ec4899');

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? '');
    setDescription(existing?.description ?? '');
    setUrl(existing?.url ?? '');
    setPrice(existing?.price ?? 50);
    setIcon(existing?.icon ?? 'gift');
    setColor(existing?.color ?? '#ec4899');
  }, [open, existing]);

  const save = () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      url: url.trim() || undefined,
      price: Math.max(1, price),
      icon,
      color,
    };
    if (itemId) app.updateShopItem(itemId, payload);
    else app.createShopItem(payload);
    onClose();
  };

  const remove = () => {
    if (itemId) app.deleteShopItem(itemId);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={itemId ? t('shop.modal.editTitle') : t('shop.modal.newTitle')}
      onClose={onClose}
    >
      <div className="ll-form">
        <label>
          {t('common.title')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('shop.modal.titlePlaceholder')}
          />
        </label>
        <label>
          {t('common.description')}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <label>
          {t('shop.modal.linkOptional')}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('shop.modal.linkPlaceholder')}
          />
        </label>
        <p className="ll-form-hint">{t('shop.modal.linkHint')}</p>
        <label>
          {t('shop.modal.priceLabel')}
          <input type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </label>
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
