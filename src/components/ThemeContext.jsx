import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'theme_mode';
const MODES = ['light', 'dark', 'system'];

const THEME_COLOR = { light: '#ffffff', dark: '#17212b' };

const getSystemTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const getPlatformTheme = () => {
  const tgScheme = window.Telegram?.WebApp?.colorScheme;
  if (tgScheme === 'light' || tgScheme === 'dark') return tgScheme;
  return getSystemTheme();
};

const getStoredMode = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

const resolveTheme = (mode) => (mode === 'system' ? getPlatformTheme() : mode);

const applyDomTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  try {
    window.Telegram?.WebApp?.setHeaderColor?.(THEME_COLOR[theme]);
    window.Telegram?.WebApp?.setBackgroundColor?.(THEME_COLOR[theme]);
  } catch {
    // older Bot API versions only accept 'bg_color'/'secondary_bg_color' keys, not hex — ignore
  }
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(getStoredMode);
  const [theme, setTheme] = useState(() => resolveTheme(getStoredMode()));

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — theme choice just won't persist across sessions
    }
  }, []);

  useEffect(() => {
    setTheme(resolveTheme(mode));
  }, [mode]);

  useEffect(() => {
    applyDomTheme(theme);
  }, [theme]);

  // System-mode: track OS-level scheme changes (web / Max, no colorScheme API).
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setTheme(resolveTheme('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  // System-mode: Telegram SDK loads asynchronously and may report the real
  // colorScheme after our first resolve — reconcile once it's ready, and keep
  // listening for in-session theme switches (e.g. user toggles Telegram's own dark mode).
  useEffect(() => {
    if (mode !== 'system') return;
    const tg = window.Telegram?.WebApp;
    if (!tg?.onEvent) return;
    const handler = () => setTheme(resolveTheme('system'));
    handler();
    tg.onEvent('themeChanged', handler);
    return () => tg.offEvent?.('themeChanged', handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
