import React, { useState } from 'react';
import { useTheme } from './ThemeProvider';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [announcement, setAnnouncement] = useState('');

  const handleToggle = () => {
    toggleTheme();
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setAnnouncement(`Switched to ${newTheme} mode`);
    
    // Clear announcement after a delay
    setTimeout(() => setAnnouncement(''), 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <>
      <button
        data-testid="theme-toggle"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        className="p-2 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div
          data-testid="theme-icon"
          data-icon={theme === 'light' ? 'sun' : 'moon'}
          className="w-5 h-5"
        >
          {theme === 'light' ? '☀️' : '🌙'}
        </div>
      </button>
      
      {announcement && (
        <div
          data-testid="theme-announcement"
          aria-live="polite"
          className="sr-only"
        >
          {announcement}
        </div>
      )}
    </>
  );
};

export default ThemeToggle;