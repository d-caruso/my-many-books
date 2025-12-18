import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, IconButton, Stack, Avatar } from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const displayTitle = title || t('theme:header.title');
  const themeToggleLabel = t('theme:settings.toggle_theme', 'Toggle theme');
  const avatarLabel = t('theme:header.user_avatar', 'User avatar');

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
    <Box
      component="header"
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          maxWidth: '1200px',
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
        }}
      >
        <Typography variant="h6" component="h1">
          {displayTitle}
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={toggleTheme} title={themeToggleLabel} aria-label={themeToggleLabel}>
            <span role="img" aria-hidden="true">
              {getThemeIcon()}
            </span>
          </IconButton>
          <Avatar
            sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}
            aria-label={avatarLabel}
          >
            U
          </Avatar>
        </Stack>
      </Box>
    </Box>
  );
};
