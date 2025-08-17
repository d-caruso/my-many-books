import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('theme');
    if (saved) return saved as Theme;
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `${theme}-theme`;
    
    // Update CSS variables
    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--color-background', 'rgb(17, 24, 39)');
      root.style.setProperty('--color-text', 'rgb(243, 244, 246)');
    } else {
      root.style.setProperty('--color-background', 'rgb(255, 255, 255)');
      root.style.setProperty('--color-text', 'rgb(17, 24, 39)');
    }
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-change if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
    
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const setTheme = (newTheme: Theme) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setThemeState(newTheme);
    
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div 
        data-testid="theme-provider" 
        data-theme={theme}
        className={isTransitioning ? 'theme-transitioning' : ''}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;