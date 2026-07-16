import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeName, defaultThemeName, themes } from './tokens';

const STORAGE_KEY = 'territoryrush.theme';

export type ThemeContextValue = Theme & {
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
};

const isThemeName = (value: unknown): value is ThemeName => value === 'light' || value === 'dark';

/**
 * Default context value = the default (light) theme with no-op setters, so
 * components render correctly even without a provider (e.g. in unit tests).
 * The runtime switch only takes effect under a real <ThemeProvider>.
 */
const ThemeContext = createContext<ThemeContextValue>({
  ...themes[defaultThemeName],
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [name, setName] = useState<ThemeName>(defaultThemeName);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isThemeName(stored)) setName(stored);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    setName(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setName((prev) => {
      const next: ThemeName = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ ...themes[name], setTheme, toggleTheme }),
    [name, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
