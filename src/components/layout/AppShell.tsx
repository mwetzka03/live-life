import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, Coins, LayoutDashboard, Settings, ShoppingBag, Target } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import { useAppState } from '../../hooks/useAppState';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { balance } = useAppState();
  const { t } = useLocale();
  const { pathname } = useLocation();
  const isSettings = pathname.startsWith('/settings');

  return (
    <div className="ll-app">
      <header className="ll-topbar">
        <div className="ll-brand">
          <img src="/app-icon.png" alt={t('brand.name')} className="ll-logo" />
          <div className="ll-brand-text">
            <strong className="ll-brand-title">{t('brand.name')}</strong>
            <span className="ll-brand-tagline">{t('brand.tagline')}</span>
          </div>
        </div>

        <nav className="ll-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <CalendarDays size={18} />
            <span>{t('nav.calendar')}</span>
          </NavLink>
          <NavLink to="/challenges" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Target size={18} />
            <span>{t('nav.challenges')}</span>
          </NavLink>
          <NavLink to="/visionboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            <LayoutDashboard size={18} />
            <span>{t('nav.visionboard')}</span>
          </NavLink>
          <NavLink to="/shop" className={({ isActive }) => (isActive ? 'active' : '')}>
            <ShoppingBag size={18} />
            <span>{t('nav.shop')}</span>
          </NavLink>
          <NavLink to="/wallet" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Coins size={18} />
            <span>{t('nav.wallet', { balance })}</span>
          </NavLink>
        </nav>

        <NavLink
          to="/settings"
          className={({ isActive }) => `ll-topbar-settings${isActive ? ' active' : ''}`}
          aria-label={t('nav.settingsAria')}
          title={t('nav.settings')}
        >
          <Settings size={22} />
        </NavLink>
      </header>
      <main className={`ll-main${isSettings ? ' ll-scroll-page' : ' ll-main-fit'}`}>{children}</main>
    </div>
  );
}
