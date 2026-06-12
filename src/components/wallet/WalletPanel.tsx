import type { ReactNode } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Coins, History } from 'lucide-react';
import type { CoinTransaction, Purchase } from '../../domain/models/AppData';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { PageHeader } from '../common/InfoTip';
import { FitPager } from '../common/FitPager';
import { useFitGridPagination } from '../../hooks/useFitGridPagination';

interface PaginatedTxListProps<T> {
  title: string;
  items: T[];
  emptyLabel: string;
  getKey: (item: T) => string;
  getItemClass?: (item: T) => string | undefined;
  renderItem: (item: T) => ReactNode;
}

function PaginatedTxList<T>({
  title,
  items,
  emptyLabel,
  getKey,
  getItemClass,
  renderItem,
}: PaginatedTxListProps<T>) {
  const { containerRef, page, setPage, pageCount, pageItems, showPager } = useFitGridPagination(items, {
    cardMinWidth: 220,
    fallbackCardHeight: 58,
    gap: 9,
    itemSelector: '.ll-tx-list li:not(.muted)',
  });

  return (
    <section className="ll-panel">
      <h2>{title}</h2>
      <div className="ll-panel-list-body" ref={containerRef}>
        <ul className="ll-tx-list">
          {items.length === 0 && <li className="muted">{emptyLabel}</li>}
          {pageItems.map((item) => (
            <li key={getKey(item)} className={getItemClass?.(item)}>
              {renderItem(item)}
            </li>
          ))}
        </ul>
      </div>
      {showPager && (
        <FitPager className="ll-fit-pager-compact" page={page} pageCount={pageCount} onPageChange={setPage} />
      )}
    </section>
  );
}

export function WalletPanel() {
  const { app, balance } = useAppState();
  const { t, locale } = useLocale();
  const transactions = app.coins.getTransactions();
  const purchases = app.shop.getPurchases();
  const totalEarned = transactions.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalSpent = Math.abs(
    transactions.filter((tx) => tx.amount < 0).reduce((s, tx) => s + tx.amount, 0),
  );
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';

  return (
    <section className="ll-page ll-page-fit ll-wallet-page">
      <div className="ll-page-fit-header">
        <PageHeader
          title={t('wallet.title')}
          subtitle={t('wallet.subtitle')}
          info={t('help.wallet')}
        />
      </div>

      <div className="ll-wallet-stats">
        <article className="ll-stat-card highlight">
          <Coins size={28} />
          <div>
            <span>{t('wallet.currentBalance')}</span>
            <strong>{balance}</strong>
          </div>
        </article>
        <article className="ll-stat-card">
          <ArrowUpCircle size={24} />
          <div>
            <span>{t('wallet.earned')}</span>
            <strong>{totalEarned}</strong>
          </div>
        </article>
        <article className="ll-stat-card">
          <ArrowDownCircle size={24} />
          <div>
            <span>{t('wallet.spent')}</span>
            <strong>{totalSpent}</strong>
          </div>
        </article>
        <article className="ll-stat-card">
          <History size={24} />
          <div>
            <span>{t('wallet.purchases')}</span>
            <strong>{purchases.length}</strong>
          </div>
        </article>
      </div>

      <div className="ll-page-fit-body ll-wallet-grid">
        <PaginatedTxList
          title={t('wallet.transactions')}
          items={transactions}
          emptyLabel={t('wallet.noTransactions')}
          getKey={(tx) => tx.id}
          getItemClass={(tx) => (tx.amount >= 0 ? 'earn' : 'spend')}
          renderItem={(tx: CoinTransaction) => (
            <>
              <span>{tx.description}</span>
              <strong>
                {tx.amount >= 0 ? '+' : ''}
                {tx.amount}
              </strong>
              <time>{new Date(tx.createdAt).toLocaleString(dateLocale)}</time>
            </>
          )}
        />

        <PaginatedTxList
          title={t('wallet.purchasesSection')}
          items={purchases}
          emptyLabel={t('wallet.noPurchases')}
          getKey={(p) => p.id}
          getItemClass={() => 'spend'}
          renderItem={(p: Purchase) => (
            <>
              <span>{p.title}</span>
              <strong>-{p.coinsSpent}</strong>
              <time>{new Date(p.purchasedAt).toLocaleString(dateLocale)}</time>
            </>
          )}
        />
      </div>
    </section>
  );
}
