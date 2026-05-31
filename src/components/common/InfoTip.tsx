import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface InfoTipProps {
  text: string;
}

export function InfoTip({ text }: InfoTipProps) {
  return (
    <span className="ll-info-tip" title={text} aria-label={text} role="note" tabIndex={0}>
      <Info size={14} aria-hidden />
    </span>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  info?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, info, actions }: PageHeaderProps) {
  return (
    <div className="ll-page-header">
      <div>
        <h1>
          {title}
          {info && <InfoTip text={info} />}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
