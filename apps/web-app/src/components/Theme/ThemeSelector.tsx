import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeName } from '../../types';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface ThemeSelectorProps {
  showLabels?: boolean;
  variant?: 'dropdown' | 'grid' | 'list';
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  showLabels = true,
  variant = 'dropdown',
  className = ''
}) => {
  const { t } = useTranslation();
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<ThemeName | null>(null);

  const themePreview = {
    default: { bg: '#f9fafb', primary: '#3b82f6', accent: '#f59e0b' },
    dark: { bg: '#111827', primary: '#60a5fa', accent: '#fbbf24' },
    bookish: { bg: '#fffbeb', primary: '#ec4899', accent: '#8b5cf6' },
    forest: { bg: '#fefce8', primary: '#22c55e', accent: '#f59e0b' },
    ocean: { bg: '#ecfeff', primary: '#06b6d4', accent: '#06b6d4' },
    sunset: { bg: '#fffbeb', primary: '#f97316', accent: '#ec4899' },
    lavender: { bg: '#faf5ff', primary: '#a855f7', accent: '#c084fc' }
  };

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
    setIsOpen(false);
    setPreviewTheme(null);
  };

  const handlePreview = (themeName: ThemeName) => {
    if (previewTheme === themeName) {
      setPreviewTheme(null);
    } else {
      setPreviewTheme(themeName);
      // Temporarily apply theme for preview
      document.documentElement.setAttribute('data-theme', themeName);
      // Reset after 2 seconds
      setTimeout(() => {
        if (previewTheme === themeName) {
          document.documentElement.setAttribute('data-theme', theme);
          setPreviewTheme(null);
        }
      }, 2000);
    }
  };

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <ResponsiveButton
          variant="secondary"
          size="md"
          onClick={() => setIsOpen(!isOpen)}
          className="min-w-[120px] justify-between"
        >
          <span className="flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-full border border-secondary-300"
              style={{ backgroundColor: themePreview[theme].primary }}
            />
            {showLabels && <span>{themes[theme]}</span>}
          </span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </ResponsiveButton>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-surface border border-secondary-200 rounded-lg shadow-lg z-50 overflow-hidden">
            {Object.entries(themes).map(([themeName, displayName]) => {
              const themeKey = themeName as ThemeName;
              const colors = themePreview[themeKey];
              
              return (
                <button
                  key={themeName}
                  onClick={() => handleThemeChange(themeKey)}
                  className={`w-full flex items-center justify-between p-3 text-left hover:bg-secondary-50 transition-colors ${
                    theme === themeKey ? 'bg-primary-50 text-primary-600' : 'text-text-primary'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div 
                        className="w-3 h-3 rounded-full border border-secondary-200"
                        style={{ backgroundColor: colors.bg }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-secondary-200"
                        style={{ backgroundColor: colors.primary }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-secondary-200"
                        style={{ backgroundColor: colors.accent }}
                      />
                    </div>
                    <span className="font-medium">{displayName}</span>
                  </div>
                  
                  {theme === themeKey && (
                    <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Backdrop */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3 ${className}`}>
        {Object.entries(themes).map(([themeName, displayName]) => {
          const themeKey = themeName as ThemeName;
          const colors = themePreview[themeKey];
          
          return (
            <button
              key={themeName}
              onClick={() => handleThemeChange(themeKey)}
              onMouseEnter={() => showLabels && setPreviewTheme(themeKey)}
              onMouseLeave={() => setPreviewTheme(null)}
              className={`p-3 rounded-lg border transition-all hover:shadow-md ${
                theme === themeKey 
                  ? 'border-primary-500 bg-primary-50 shadow-md' 
                  : 'border-secondary-200 bg-surface hover:border-secondary-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="flex space-x-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-secondary-200"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-secondary-200"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-secondary-200"
                    style={{ backgroundColor: colors.accent }}
                  />
                </div>
                {showLabels && (
                  <span className={`text-xs font-medium ${
                    theme === themeKey ? 'text-primary-600' : 'text-text-secondary'
                  }`}>
                    {displayName}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // List variant
  return (
    <div className={`space-y-2 ${className}`}>
      {Object.entries(themes).map(([themeName, displayName]) => {
        const themeKey = themeName as ThemeName;
        const colors = themePreview[themeKey];
        
        return (
          <div
            key={themeName}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              theme === themeKey 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-secondary-200 bg-surface hover:border-secondary-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div 
                  className="w-4 h-4 rounded-full border border-secondary-200"
                  style={{ backgroundColor: colors.bg }}
                />
                <div 
                  className="w-4 h-4 rounded-full border border-secondary-200"
                  style={{ backgroundColor: colors.primary }}
                />
                <div 
                  className="w-4 h-4 rounded-full border border-secondary-200"
                  style={{ backgroundColor: colors.accent }}
                />
              </div>
              {showLabels && (
                <span className="font-medium text-text-primary">{displayName}</span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <ResponsiveButton
                variant="ghost"
                size="sm"
                onClick={() => handlePreview(themeKey)}
                className={previewTheme === themeKey ? 'bg-secondary-100' : ''}
              >
                {previewTheme === themeKey ? t('theme:selector.previewing') : t('theme:selector.preview')}
              </ResponsiveButton>

              <ResponsiveButton
                variant={theme === themeKey ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleThemeChange(themeKey)}
                disabled={theme === themeKey}
              >
                {theme === themeKey ? t('theme:selector.active') : t('theme:selector.select')}
              </ResponsiveButton>
            </div>
          </div>
        );
      })}
    </div>
  );
};