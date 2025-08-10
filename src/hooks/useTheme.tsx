import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: 'light' | 'dark';
  fontScale: number;
  setFontScale: (scale: number) => void;
  accentPrimary: string;
  accentSecondary: string;
  setAccentColors: (primary: string, secondary: string) => void;
  contrastMode: 'normal' | 'high';
  setContrastMode: (mode: 'normal' | 'high') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'dlm_theme_preference';
const FONT_SCALE_STORAGE_KEY = 'dlm_font_scale';
const ACCENT_PRIMARY_KEY = 'dlm_accent_primary';
const ACCENT_SECONDARY_KEY = 'dlm_accent_secondary';
const CONTRAST_MODE_KEY = 'dlm_contrast_mode';

function applyDomTheme(resolved: 'light' | 'dark', fontScale: number, accentPrimary?: string, accentSecondary?: string, contrastMode: 'normal' | 'high' = 'normal') {
  const root = document.documentElement;
  // Tailwind dark mode toggle
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  // CSS variable for font scale
  root.style.setProperty('--font-scale', String(fontScale));
  if (accentPrimary) root.style.setProperty('--accent-primary', accentPrimary);
  if (accentSecondary) root.style.setProperty('--accent-secondary', accentSecondary);
  root.setAttribute('data-contrast', contrastMode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null : null;
    return saved || 'dark';
  });
  const [fontScale, setFontScaleState] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(FONT_SCALE_STORAGE_KEY) : null;
    const parsed = saved ? Number(saved) : 1;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const [accentPrimary, setAccentPrimary] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem(ACCENT_PRIMARY_KEY) : null) || '#06b6d4');
  const [accentSecondary, setAccentSecondary] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem(ACCENT_SECONDARY_KEY) : null) || '#3b82f6');
  const [contrastMode, setContrastModeState] = useState<'normal' | 'high'>(() => (typeof window !== 'undefined' ? (localStorage.getItem(CONTRAST_MODE_KEY) as any) : null) || 'normal');

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const resolvedTheme = useMemo<'light' | 'dark'>(
    () => (theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme),
    [theme, systemPrefersDark]
  );

  // Apply theme and font scale to DOM
  useEffect(() => {
    applyDomTheme(resolvedTheme, fontScale, accentPrimary, accentSecondary, contrastMode);
  }, [resolvedTheme, fontScale, accentPrimary, accentSecondary, contrastMode]);

  // Watch system preference changes when theme=system
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    try {
      media.addEventListener('change', handler);
    } catch {
      // Safari fallback
      // @ts-ignore
      media.addListener(handler);
    }
    return () => {
      try {
        media.removeEventListener('change', handler);
      } catch {
        // @ts-ignore
        media.removeListener(handler);
      }
    };
  }, []);

  const setTheme = (pref: ThemePreference) => {
    setThemeState(pref);
    try { localStorage.setItem(THEME_STORAGE_KEY, pref); } catch {}
  };

  const setFontScale = (scale: number) => {
    const clamped = Math.min(1.25, Math.max(0.9, scale));
    setFontScaleState(clamped);
    try { localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(clamped)); } catch {}
  };

  const setAccentColors = (primary: string, secondary: string) => {
    setAccentPrimary(primary);
    setAccentSecondary(secondary);
    try {
      localStorage.setItem(ACCENT_PRIMARY_KEY, primary);
      localStorage.setItem(ACCENT_SECONDARY_KEY, secondary);
    } catch {}
  };

  const setContrastMode = (mode: 'normal' | 'high') => {
    setContrastModeState(mode);
    try { localStorage.setItem(CONTRAST_MODE_KEY, mode); } catch {}
  };

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, fontScale, setFontScale, accentPrimary, accentSecondary, setAccentColors, contrastMode, setContrastMode }),
    [theme, resolvedTheme, fontScale, accentPrimary, accentSecondary, contrastMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}


