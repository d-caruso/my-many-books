import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Typography,
  Paper,
  Box,
  Alert
} from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeSelector } from './ThemeSelector';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface ThemeSettingsProps {
  className?: string;
  showSystemOption?: boolean;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({
  className = '',
  showSystemOption = true
}) => {
  const { t } = useTranslation();
  const { autoTheme, setAutoTheme, systemTheme } = useTheme();

  return (
    <Stack spacing={3} className={className}>
      <Box>
        <Typography variant="h6" gutterBottom>
          {t('theme:settings.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('theme:settings.description')}
        </Typography>
      </Box>

      {showSystemOption && (
        <Stack spacing={2}>
          <Typography variant="subtitle1">{t('theme:settings.theme_mode')}</Typography>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle2">{t('theme:settings.auto_system')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('theme:settings.auto_description')}
                {autoTheme && (
                  <Box component="span" display="block" mt={0.5} color="primary.main" fontWeight={600}>
                    {systemTheme === 'dark'
                      ? t('theme:settings.currently_using_dark')
                      : t('theme:settings.currently_using_light')}
                  </Box>
                )}
              </Typography>
            </Box>
            <ResponsiveButton
              variant={autoTheme ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setAutoTheme(!autoTheme)}
            >
              {autoTheme ? t('theme:settings.enabled') : t('theme:settings.enable')}
            </ResponsiveButton>
          </Paper>
        </Stack>
      )}

      {!autoTheme && (
        <Stack spacing={2}>
          <Typography variant="subtitle1">{t('theme:settings.choose_theme')}</Typography>
          <ThemeSelector variant="list" showLabels />
        </Stack>
      )}

      {autoTheme && (
        <Alert severity="info">
          <Typography variant="body2" fontWeight={600}>
            {t('theme:settings.auto_enabled')}
          </Typography>
          <Typography variant="caption" display="block">
            {t('theme:settings.auto_enabled_description')}
          </Typography>
        </Alert>
      )}
    </Stack>
  );
};
