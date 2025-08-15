import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeName } from '../types';

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

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [autoTheme, setAutoTheme] = useState(() => {
    return localStorage.getItem('autoTheme') === 'true';
  });
  
  const [theme, setTheme] = useState<ThemeName>(() => {
    const savedAutoTheme = localStorage.getItem('autoTheme') === 'true';
    if (savedAutoTheme) {
      // Detect system theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'default';
    }
    // Get theme from localStorage or default to 'default'
    const savedTheme = localStorage.getItem('theme') as ThemeName;
    return savedTheme || 'default';
  });

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
    
    // Save preferences to localStorage
    if (!autoTheme) {
      localStorage.setItem('theme', theme);
    }
    localStorage.setItem('autoTheme', autoTheme.toString());
  }, [theme, autoTheme]);

  const handleSetTheme = (newTheme: ThemeName) => {
    setAutoTheme(false);
    setTheme(newTheme);
  };

  const handleSetAutoTheme = (auto: boolean) => {
    setAutoTheme(auto);
    if (auto) {
      setTheme(systemTheme === 'dark' ? 'dark' : 'default');
      localStorage.removeItem('theme'); // Remove manual theme preference
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