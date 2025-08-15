import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'My Many Books' }) => {
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return '🌙';
      case 'bookish':
        return '📚';
      default:
        return '☀️';
    }
  };

  return (
    <header className="bg-surface shadow-sm border-b border-secondary-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-text-primary">
              {title}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-secondary-100 transition-colors"
              title="Toggle theme"
            >
              <span className="text-lg">{getThemeIcon()}</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">U</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};