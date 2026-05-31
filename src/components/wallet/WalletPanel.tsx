import { ArrowDownCircle, ArrowUpCircle, Coins, History } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';
import { PageHeader } from '../common/InfoTip';

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
    <section className="ll-page">
      <PageHeader
        title={t('wallet.title')}
        subtitle={t('wallet.subtitle')}
        info={t('help.wallet')}
      />

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

      <div className="ll-wallet-grid">
        <section className="ll-panel">
          <h2>{t('wallet.transactions')}</h2>
          <ul className="ll-tx-list">
            {transactions.length === 0 && <li className="muted">{t('wallet.noTransactions')}</li>}
            {transactions.map((tx) => (
              <li key={tx.id} className={tx.amount >= 0 ? 'earn' : 'spend'}>
                <span>{tx.description}</span>
                <strong>
                  {tx.amount >= 0 ? '+' : ''}
                  {tx.amount}
                </strong>
                <time>{new Date(tx.createdAt).toLocaleString(dateLocale)}</time>
              </li>
            ))}
          </ul>
        </section>

        <section className="ll-panel">
          <h2>{t('wallet.purchasesSection')}</h2>
          <ul className="ll-tx-list">
            {purchases.length === 0 && <li className="muted">{t('wallet.noPurchases')}</li>}
            {purchases.map((p) => (
              <li key={p.id} className="spend">
                <span>{p.title}</span>
                <strong>-{p.coinsSpent}</strong>
                <time>{new Date(p.purchasedAt).toLocaleString(dateLocale)}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
