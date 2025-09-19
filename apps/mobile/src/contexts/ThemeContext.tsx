import * as React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  theme: typeof MD3LightTheme;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2196F3',
    secondary: '#FF9800',
    tertiary: '#4CAF50',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#2196F3',
    secondary: '#FF9800',
    tertiary: '#4CAF50',
  },
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = React.useState<ThemeMode>('system');
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    loadStoredTheme();
  }, []);

  const loadStoredTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('themeMode');
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        setThemeModeState(storedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load stored theme:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  React.useEffect(() => {
    if (themeMode === 'system') {
      // In a real app, you'd check the system theme
      // For now, we'll default to light theme
      setIsDark(false);
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode]);

  const theme = isDark ? darkTheme : lightTheme;

  const value: ThemeContextType = {
    themeMode,
    isDark,
    setThemeMode,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};