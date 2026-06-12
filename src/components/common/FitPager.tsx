import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';

interface FitPagerProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function FitPager({ page, pageCount, onPageChange, className = '' }: FitPagerProps) {
  const { t } = useLocale();

  return (
    <div className={`ll-fit-pager${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="ll-icon-btn"
        disabled={page <= 0}
        onClick={() => onPageChange(Math.max(0, page - 1))}
        aria-label={t('common.back')}
      >
        <ChevronLeft size={16} />
      </button>
      <span>
        {page + 1} / {pageCount}
      </span>
      <button
        type="button"
        className="ll-icon-btn"
        disabled={page >= pageCount - 1}
        onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        aria-label={t('common.next')}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
