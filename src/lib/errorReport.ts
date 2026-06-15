import { getStartupDevLogEntries, type DevLogEntry } from './startupDevLog';

export interface ErrorReportPayload {
  title: string;
  message: string;
  stack?: string;
  context?: string;
  actionFlow?: string[];
  timestamp: string;
  appVersion: string;
  userAgent: string;
  devLog: DevLogEntry[];
}

export interface ErrorReportInput {
  title: string;
  error: unknown;
  context?: string;
  actionFlow?: string[];
}

type ErrorListener = (report: ErrorReportPayload | null) => void;

let activeReport: ErrorReportPayload | null = null;
const listeners = new Set<ErrorListener>();

function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function errorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) return error.stack;
  return undefined;
}

function notify() {
  for (const listener of listeners) {
    listener(activeReport);
  }
}

export function showErrorReport(input: ErrorReportInput): ErrorReportPayload {
  const report: ErrorReportPayload = {
    title: input.title,
    message: errorText(input.error),
    stack: errorStack(input.error),
    context: input.context,
    actionFlow: input.actionFlow,
    timestamp: new Date().toISOString(),
    appVersion: '0.2.3',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    devLog: getStartupDevLogEntries(),
  };
  activeReport = report;
  notify();
  return report;
}

export function dismissErrorReport(): void {
  activeReport = null;
  notify();
}

export function getActiveErrorReport(): ErrorReportPayload | null {
  return activeReport;
}

export function subscribeErrorReport(listener: ErrorListener): () => void {
  listeners.add(listener);
  listener(activeReport);
  return () => listeners.delete(listener);
}

export function downloadErrorReport(report: ErrorReportPayload): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `live-life-error-${report.timestamp.replace(/[:.]/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function invokeErrorText(error: unknown): string {
  return errorText(error);
}
