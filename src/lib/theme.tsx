import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgMuted: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  coin: string;
  coinSoft: string;
  success: string;
  danger: string;
  challenge: string;
  event: string;
  shop: string;
}

const light: ThemeColors = {
  bg: '#f4f6fb',
  bgCard: '#ffffff',
  bgMuted: '#eef1f8',
  text: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  accent: '#6366f1',
  accentSoft: '#eef2ff',
  coin: '#f59e0b',
  coinSoft: '#fef3c7',
  success: '#10b981',
  danger: '#ef4444',
  challenge: '#8b5cf6',
  event: '#3b82f6',
  shop: '#ec4899',
};

const dark: ThemeColors = {
  bg: '#0f1117',
  bgCard: '#1a1d27',
  bgMuted: '#252936',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  border: '#2d3344',
  accent: '#818cf8',
  accentSoft: '#312e81',
  coin: '#fbbf24',
  coinSoft: '#422006',
  success: '#34d399',
  danger: '#f87171',
  challenge: '#a78bfa',
  event: '#60a5fa',
  shop: '#f472b6',
};

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('live-life-theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const colors = mode === 'dark' ? dark : light;

  useEffect(() => {
    localStorage.setItem('live-life-theme', mode);
    const root = document.documentElement;
    root.style.setProperty('--ll-bg', colors.bg);
    root.style.setProperty('--ll-bg-card', colors.bgCard);
    root.style.setProperty('--ll-bg-muted', colors.bgMuted);
    root.style.setProperty('--ll-text', colors.text);
    root.style.setProperty('--ll-text-muted', colors.textMuted);
    root.style.setProperty('--ll-border', colors.border);
    root.style.setProperty('--ll-accent', colors.accent);
    root.style.setProperty('--ll-accent-soft', colors.accentSoft);
    root.style.setProperty('--ll-coin', colors.coin);
    root.style.setProperty('--ll-coin-soft', colors.coinSoft);
    root.style.setProperty('--ll-success', colors.success);
    root.style.setProperty('--ll-danger', colors.danger);
    root.style.setProperty('--ll-challenge', colors.challenge);
    root.style.setProperty('--ll-event', colors.event);
    root.style.setProperty('--ll-shop', colors.shop);
    document.body.style.background = colors.bg;
    document.body.style.color = colors.text;
  }, [mode, colors]);

  const value = useMemo(
    () => ({
      mode,
      colors,
      toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
      setMode,
    }),
    [mode, colors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
