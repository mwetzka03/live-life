import { useState } from 'react';
import { Gift, Plus, Repeat, Unlink } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { useLoading } from '../../lib/loading/LoadingProvider';
import { AppIcon } from '../common/AppIcon';

interface EventShopAssignProps {
  eventId: string;
  eventTitle: string;
  linkedShopItemId?: string;
  isRecurring?: boolean;
  isClaimed: boolean;
}

export function EventShopAssign({
  eventId,
  eventTitle,
  linkedShopItemId,
  isRecurring,
  isClaimed,
}: EventShopAssignProps) {
  const { app, balance } = useAppState();
  const { runWithLoading } = useLoading();
  const { t } = useLocale();
  const [selectedId, setSelectedId] = useState('');
  const [newTitle, setNewTitle] = useState(eventTitle);
  const [newPrice, setNewPrice] = useState(25);
  const [newDescription, setNewDescription] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const linked = linkedShopItemId ? app.shop.getById(linkedShopItemId) : undefined;
  const shopItems = app.shop.getItems();

  const assignExisting = () => {
    if (!selectedId) return;
    void runWithLoading(async () => {
      app.assignEventToShopItem(eventId, selectedId);
      setSelectedId('');
    }, t('loading.rewardAssign'));
  };

  const createAndAssign = () => {
    if (!newTitle.trim()) return;
    void runWithLoading(async () => {
      app.createShopItemFromEvent(eventId, {
        title: newTitle.trim(),
        price: newPrice,
        description: newDescription.trim() || undefined,
      });
      setShowCreate(false);
    }, t('loading.rewardCreate'));
  };

  const unlink = () => {
    app.unlinkEventFromShopItem(eventId);
  };

  return (
    <div className="ll-event-challenge-assign">
      <h3>
        <Gift size={16} /> {t('calendar.shopAssign.title')}
      </h3>
      {isRecurring && (
        <p className="ll-form-hint ll-recurring-badge">
          <Repeat size={14} /> {t('calendar.shopAssign.recurring')}
        </p>
      )}
      <p className="ll-form-hint">{t('calendar.shopAssign.hint')}</p>

      {linked && (
        <div className="ll-linked-challenge">
          <AppIcon name={linked.icon} size={18} color={linked.color} />
          <div>
            <strong style={{ color: linked.color }}>{linked.title}</strong>
            <span className="ll-form-hint">
              {t('calendar.shopAssign.priceCoins', { price: linked.price })}
            </span>
            {isClaimed && <span className="ll-form-hint">{t('calendar.shopAssign.alreadyClaimed')}</span>}
            {!isClaimed && balance < linked.price && (
              <span className="ll-form-hint error-text">
                {t('calendar.shopAssign.needMore', { shortfall: linked.price - balance })}
              </span>
            )}
            {!isClaimed && balance >= linked.price && (
              <span className="ll-form-hint">{t('calendar.shopAssign.tapToRedeem')}</span>
            )}
          </div>
          {!isClaimed && (
            <button type="button" className="ll-btn small ghost" onClick={unlink}>
              <Unlink size={14} /> {t('calendar.shopAssign.remove')}
            </button>
          )}
        </div>
      )}

      {!linked && (
        <>
          {shopItems.length > 0 && (
            <div className="ll-event-assign-row">
              <label className="ll-form-grow">
                {t('calendar.shopAssign.existing')}
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {shopItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({t('shop.priceCoins', { price: item.price })})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="ll-btn small primary ll-event-assign-btn"
                disabled={!selectedId}
                onClick={assignExisting}
              >
                {t('calendar.shopAssign.assign')}
              </button>
            </div>
          )}

          {!showCreate ? (
            <button type="button" className="ll-btn small ll-event-create-toggle" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> {t('calendar.shopAssign.createNew')}
            </button>
          ) : (
            <div className="ll-event-challenge-create">
              <label>
                {t('common.title')}
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </label>
              <label>
                {t('calendar.shopAssign.descriptionOptional')}
                <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              </label>
              <label>
                {t('calendar.shopAssign.priceLabel')}
                <input
                  type="number"
                  min={1}
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                />
              </label>
              <div className="ll-form-actions-right">
                <button type="button" className="ll-btn small ghost" onClick={() => setShowCreate(false)}>
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="ll-btn small primary"
                  disabled={!newTitle.trim()}
                  onClick={createAndAssign}
                >
                  {t('calendar.shopAssign.createAssign')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
