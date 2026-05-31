import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, title, onClose, children, wide }: ModalProps) {
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ll-modal-backdrop" onClick={onClose}>
      <div
        className={`ll-modal${wide ? ' ll-modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="ll-modal-header">
          <h2>{title}</h2>
          <button type="button" className="ll-icon-btn" onClick={onClose} aria-label={t('modal.closeAria')}>
            <X size={18} />
          </button>
        </header>
        <div className="ll-modal-body">{children}</div>
      </div>
    </div>
  );
}
