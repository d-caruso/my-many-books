import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Paper,
  Typography,
  Stack
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeName } from '../../types';
import { ResponsiveButton } from '../UI/ResponsiveButton';

interface ThemeSelectorProps {
  showLabels?: boolean;
  variant?: 'dropdown' | 'grid' | 'list' | 'compact';
  className?: string;
}

const themePreview = {
  default: { bg: '#f9fafb', primary: '#3b82f6', accent: '#f59e0b' },
  dark: { bg: '#111827', primary: '#60a5fa', accent: '#fbbf24' },
  bookish: { bg: '#fffbeb', primary: '#ec4899', accent: '#8b5cf6' },
  forest: { bg: '#fefce8', primary: '#22c55e', accent: '#f59e0b' },
  ocean: { bg: '#ecfeff', primary: '#06b6d4', accent: '#06b6d4' },
  sunset: { bg: '#fffbeb', primary: '#f97316', accent: '#ec4899' },
  lavender: { bg: '#faf5ff', primary: '#a855f7', accent: '#c084fc' }
} satisfies Record<ThemeName, { bg: string; primary: string; accent: string }>;

const ColorDots: React.FC<{ colors: { bg: string; primary: string; accent: string } }> = ({ colors }) => (
  <Stack direction="row" spacing={0.5}>
    {Object.values(colors).map((color, idx) => (
      <Box
        key={color + idx}
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: color,
        }}
      />
    ))}
  </Stack>
);

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  showLabels = true,
  variant = 'dropdown',
  className = ''
}) => {
  const { t } = useTranslation();
  const { theme, setTheme, themes } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<ThemeName | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const previewTimer = useRef<number>();

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
    setPreviewTheme(null);
    setAnchorEl(null);
  };

  const handlePreview = (themeName: ThemeName) => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
    }

    const doc = typeof document !== 'undefined' ? document : null;

    if (previewTheme === themeName) {
      if (doc) {
        doc.documentElement.setAttribute('data-theme', theme);
      }
      setPreviewTheme(null);
      return;
    }

    setPreviewTheme(themeName);
    if (doc) {
      doc.documentElement.setAttribute('data-theme', themeName);
      previewTimer.current = window.setTimeout(() => {
        doc.documentElement.setAttribute('data-theme', theme);
        setPreviewTheme(null);
        previewTimer.current = undefined;
      }, 2000);
    }
  };

  const items = useMemo(() => Object.entries(themes), [themes]);
  useEffect(() => () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
    }
  }, []);

  const dropdown = (
    <Box className={className} sx={{ display: 'inline-block' }}>
      <Button
        variant="outlined"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        endIcon={<ExpandMoreIcon />}
        sx={{ minWidth: 180 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <ColorDots colors={themePreview[theme]} />
          {showLabels && <Typography variant="body2">{themes[theme]}</Typography>}
        </Stack>
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {items.map(([themeName, displayName]) => {
          const themeKey = themeName as ThemeName;
          return (
            <MenuItem
              key={themeName}
              selected={theme === themeKey}
              onClick={() => handleThemeChange(themeKey)}
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                <ColorDots colors={themePreview[themeKey]} />
                <Typography variant="body2">{displayName}</Typography>
              </Stack>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );

  if (variant === 'dropdown') {
    return dropdown;
  }

  if (variant === 'grid' || variant === 'compact') {
    const gridProps = variant === 'compact'
      ? { xs: 6, sm: 4, md: 3 }
      : { xs: 6, sm: 4, md: 3, lg: 2 };

    return (
      <Grid container spacing={2} className={className}>
        {items.map(([themeName, displayName]) => {
          const themeKey = themeName as ThemeName;
          const active = theme === themeKey;
          return (
            <Grid key={themeName} {...gridProps}>
              <Paper
                component="button"
                type="button"
                variant="outlined"
                onClick={() => handleThemeChange(themeKey)}
                sx={{
                  p: 2,
                  borderColor: active ? 'primary.main' : 'divider',
                  bgcolor: active ? 'primary.50' : 'background.paper',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                  '&:hover': { boxShadow: 2 },
                  '&:focus-visible': {
                    outline: (themeObj) => `2px solid ${themeObj.palette.primary.main}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <Stack spacing={1} alignItems="center">
                  <ColorDots colors={themePreview[themeKey]} />
                  {showLabels && (
                    <Typography variant="body2" color={active ? 'primary.main' : 'text.secondary'}>
                      {displayName}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    );
  }

  return (
    <Stack spacing={2} className={className}>
      {items.map(([themeName, displayName]) => {
        const themeKey = themeName as ThemeName;
        const active = theme === themeKey;

        return (
          <Paper
            key={themeName}
            variant="outlined"
            sx={{
              p: 2,
              borderColor: active ? 'primary.main' : 'divider',
              bgcolor: active ? 'primary.50' : 'background.paper',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <ColorDots colors={themePreview[themeKey]} />
                {showLabels && (
                  <Typography variant="body1" fontWeight={600}>
                    {displayName}
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <ResponsiveButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(themeKey)}
                >
                  {previewTheme === themeKey ? t('theme:selector.previewing') : t('theme:selector.preview')}
                </ResponsiveButton>
                <ResponsiveButton
                  variant={active ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleThemeChange(themeKey)}
                  disabled={active}
                >
                  {active ? t('theme:selector.active') : t('theme:selector.select')}
                </ResponsiveButton>
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
};
