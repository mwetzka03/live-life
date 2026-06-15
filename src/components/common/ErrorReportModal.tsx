import { AlertTriangle, Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '../../i18n/LocaleProvider';
import {
  dismissErrorReport,
  downloadErrorReport,
  subscribeErrorReport,
  type ErrorReportPayload,
} from '../../lib/errorReport';
import { Modal } from './Modal';

export function ErrorReportModal() {
  const { t } = useLocale();
  const [report, setReport] = useState<ErrorReportPayload | null>(null);

  useEffect(() => subscribeErrorReport(setReport), []);

  if (!report) return null;

  return (
    <Modal open={true} onClose={dismissErrorReport} title={report.title}>
      <div className="ll-error-report">
        <div className="ll-error-report-icon">
          <AlertTriangle size={28} aria-hidden />
        </div>
        <p className="ll-error-report-message">{report.message}</p>
        {report.context && (
          <p className="ll-form-hint">
            <strong>{t('errors.context')}:</strong> {report.context}
          </p>
        )}
        {report.actionFlow && report.actionFlow.length > 0 && (
          <div className="ll-error-report-flow">
            <strong>{t('errors.actionFlow')}</strong>
            <ol>
              {report.actionFlow.map((step: string, i: number) => (
                <li key={`${i}-${step}`}>{step}</li>
              ))}
            </ol>
          </div>
        )}
        {report.stack && (
          <pre className="ll-error-report-stack">{report.stack}</pre>
        )}
        <div className="ll-form-actions-right">
          <button type="button" className="ll-btn ghost" onClick={dismissErrorReport}>
            <X size={16} />
            {t('common.close')}
          </button>
          <button
            type="button"
            className="ll-btn primary"
            onClick={() => downloadErrorReport(report)}
          >
            <Download size={16} />
            {t('errors.exportReport')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
