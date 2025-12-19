import { createTheme } from '@mui/material/styles';
import { themes } from '../themes';
import { designTokens } from '../tokens';
import type { ThemeName } from '@my-many-books/shared-types';

describe('Material-UI integration', () => {
  test('can create a MUI theme for each shared-design theme', () => {
    for (const [name, theme] of Object.entries(themes) as Array<[ThemeName, (typeof themes)[ThemeName]]>) {
      const muiTheme = createTheme({
        palette: {
          mode: name === 'dark' ? 'dark' : 'light',
          primary: { main: theme.colors.primary },
          secondary: { main: theme.colors.secondary },
          background: {
            default: theme.colors.background,
            paper: theme.colors.surface,
          },
          text: {
            primary: theme.colors.text.primary,
            secondary: theme.colors.text.secondary,
          },
          success: { main: theme.colors.semantic.success },
          warning: { main: theme.colors.semantic.warning },
          error: { main: theme.colors.semantic.error },
          info: { main: theme.colors.semantic.info },
        },
        typography: {
          fontFamily: designTokens.typography.fontFamily.primary,
          fontSize: designTokens.typography.fontSize.base,
          fontWeightLight: designTokens.typography.fontWeight.light,
          fontWeightRegular: designTokens.typography.fontWeight.normal,
          fontWeightMedium: designTokens.typography.fontWeight.medium,
          fontWeightBold: designTokens.typography.fontWeight.bold,
        },
        shape: {
          borderRadius: designTokens.borderRadius.md,
        },
      });

      expect(muiTheme.palette.primary.main).toBe(theme.colors.primary);
      expect(muiTheme.palette.background.default).toBe(theme.colors.background);
      expect(muiTheme.typography.fontFamily).toContain('Inter');
    }
  });
});

