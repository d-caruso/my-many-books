import * as React from 'react';
import { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { themes } from '@my-many-books/shared-design';

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
    primary: themes.default.colors.primary,
    secondary: themes.default.colors.semantic.warning,
    tertiary: themes.default.colors.semantic.success,
    error: themes.default.colors.semantic.error,
    background: themes.default.colors.background,
    surface: themes.default.colors.surface,
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: themes.dark.colors.primary,
    secondary: themes.dark.colors.semantic.warning,
    tertiary: themes.dark.colors.semantic.success,
    error: themes.dark.colors.semantic.error,
    background: themes.dark.colors.background,
    surface: themes.dark.colors.surface,
  },
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = React.useState<ThemeMode>('system');
  const [isDark, setIsDark] = React.useState(false);

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
    void loadStoredTheme();
  }, []);

  React.useEffect(() => {
    if (themeMode === 'system') {
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
