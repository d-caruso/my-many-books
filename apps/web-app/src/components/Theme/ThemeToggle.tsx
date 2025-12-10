import React, { useState } from 'react';
import { IconButton, Box } from '@mui/material';
import { useTheme } from './ThemeProvider';

const srOnlyStyles = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute' as const,
  width: 1,
};

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [announcement, setAnnouncement] = useState('');

  const handleToggle = () => {
    toggleTheme();
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setAnnouncement(`Switched to ${newTheme} mode`);
    setTimeout(() => setAnnouncement(''), 1000);
  };

  const icon = theme === 'light' ? 'sun' : 'moon';
  const label = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`;

  return (
    <>
      <IconButton
        data-testid="theme-toggle"
        onClick={handleToggle}
        aria-label={label}
        size="large"
      >
        <Box data-testid="theme-icon" data-icon={icon} component="span" fontSize="1.5rem">
          {theme === 'light' ? '☀️' : '🌙'}
        </Box>
      </IconButton>

      {announcement && (
        <Box
          component="div"
          data-testid="theme-announcement"
          aria-live="polite"
          sx={srOnlyStyles}
        >
          {announcement}
        </Box>
      )}
    </>
  );
};

export default ThemeToggle;
