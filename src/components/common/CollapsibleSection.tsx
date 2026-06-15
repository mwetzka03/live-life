import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useLocale } from '../../i18n/LocaleProvider';

interface CollapsibleSectionProps {
  className?: string;
  defaultCollapsed?: boolean;
  headerIcon: ReactNode;
  title: ReactNode;
  headerRight?: ReactNode;
  collapsedSummary: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  className = '',
  defaultCollapsed = true,
  headerIcon,
  title,
  headerRight,
  collapsedSummary,
  children,
}: CollapsibleSectionProps) {
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section className={`ll-collapsible-section${className ? ` ${className}` : ''}`}>
      <header className="ll-collapsible-header">
        <button
          type="button"
          className="ll-collapsible-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
        >
          {headerIcon}
          <span className="ll-collapsible-title">{title}</span>
          {collapsed && <span className="ll-collapsible-summary">{collapsedSummary}</span>}
          {collapsed ? <ChevronDown size={18} aria-hidden /> : <ChevronUp size={18} aria-hidden />}
          <span className="sr-only">{collapsed ? t('common.expand') : t('common.collapse')}</span>
        </button>
        {headerRight && !collapsed && <div className="ll-collapsible-header-right">{headerRight}</div>}
        {headerRight && collapsed && (
          <div className="ll-collapsible-header-right muted">{headerRight}</div>
        )}
      </header>
      {!collapsed && <div className="ll-collapsible-body">{children}</div>}
    </section>
  );
}
