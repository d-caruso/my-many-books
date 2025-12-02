import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeName } from '../types';
import { useLocalStorage } from '@my-many-books/shared-ui-hooks';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  themes: Record<ThemeName, string>;
  systemTheme: 'light' | 'dark';
  autoTheme: boolean;
  setAutoTheme: (auto: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const resolveSystemTheme = (): ThemeName => {
  if (typeof window === 'undefined') {
    return 'default';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    resolveSystemTheme() === 'dark' ? 'dark' : 'light'
  );

  const [autoTheme, setAutoThemePreference] = useLocalStorage<boolean>('autoTheme', false);
  const [storedTheme, setStoredThemePreference, removeStoredThemePreference] = useLocalStorage<ThemeName>(
    'theme',
    'default'
  );

  const initialTheme = useMemo<ThemeName>(() => {
    return autoTheme ? resolveSystemTheme() : storedTheme;
  }, [autoTheme, storedTheme]);

  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  const themes: Record<ThemeName, string> = {
    default: 'Default',
    dark: 'Dark',
    bookish: 'Bookish',
    forest: 'Forest',
    ocean: 'Ocean',
    sunset: 'Sunset',
    lavender: 'Lavender'
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      
      if (autoTheme) {
        setTheme(newSystemTheme === 'dark' ? 'dark' : 'default');
      }
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [autoTheme]);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    if (!autoTheme) {
      setStoredThemePreference(theme);
    }
  }, [theme, autoTheme, setStoredThemePreference]);

  useEffect(() => {
    if (autoTheme) {
      setTheme(resolveSystemTheme());
      removeStoredThemePreference();
    }
  }, [autoTheme, removeStoredThemePreference]);

  useEffect(() => {
    if (!autoTheme && storedTheme && storedTheme !== theme) {
      setTheme(storedTheme);
    }
  }, [storedTheme, autoTheme, theme]);

  const handleSetTheme = (newTheme: ThemeName) => {
    setAutoThemePreference(false);
    setTheme(newTheme);
  };

  const handleSetAutoTheme = (auto: boolean) => {
    setAutoThemePreference(auto);
    if (auto) {
      setTheme(systemTheme === 'dark' ? 'dark' : 'default');
      removeStoredThemePreference();
    } else if (storedTheme) {
      setTheme(storedTheme);
    }
  };

  const toggleTheme = () => {
    const themeNames: ThemeName[] = ['default', 'dark', 'bookish', 'forest', 'ocean', 'sunset', 'lavender'];
    const currentIndex = themeNames.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    handleSetTheme(themeNames[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme: handleSetTheme, 
      toggleTheme, 
      themes,
      systemTheme,
      autoTheme,
      setAutoTheme: handleSetAutoTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
