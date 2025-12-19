import { themes } from '../themes';
import { designTokens } from '../tokens';
import type { ThemeName } from '@my-many-books/shared-types';

const hexColor = /^#[0-9A-Fa-f]{6}$/;

describe('themes', () => {
  test('snapshot', () => {
    expect(themes).toMatchSnapshot();
  });

  test('record keys are complete and stable', () => {
    const themeNames = Object.keys(themes).sort();
    expect(themeNames).toEqual(['bookish', 'dark', 'default', 'forest', 'lavender', 'ocean', 'sunset']);
  });

  test('each theme has a valid structure', () => {
    for (const [key, theme] of Object.entries(themes) as Array<[ThemeName, (typeof themes)[ThemeName]]>) {
      expect(theme.name).toBe(key);
      expect(typeof theme.displayName).toBe('string');
      expect(theme.displayName.length).toBeGreaterThan(0);

      expect(theme.colors.primary).toMatch(hexColor);
      expect(theme.colors.secondary).toMatch(hexColor);
      expect(theme.colors.accent).toMatch(hexColor);
      expect(theme.colors.surface).toMatch(hexColor);
      expect(theme.colors.background).toMatch(hexColor);

      expect(theme.colors.text.primary).toMatch(hexColor);
      expect(theme.colors.text.secondary).toMatch(hexColor);
      expect(theme.colors.text.muted).toMatch(hexColor);

      expect(theme.colors.semantic.success).toMatch(hexColor);
      expect(theme.colors.semantic.warning).toMatch(hexColor);
      expect(theme.colors.semantic.error).toMatch(hexColor);
      expect(theme.colors.semantic.info).toMatch(hexColor);
    }
  });

  test('switching themes changes primary color', () => {
    const defaultTheme = themes.default;
    const darkTheme = themes.dark;

    expect(defaultTheme.colors.primary).not.toBe(darkTheme.colors.primary);
    expect(defaultTheme.colors.background).not.toBe(darkTheme.colors.background);
  });

  test('default and dark themes align with designTokens neutrals', () => {
    expect(themes.default.colors.background).toBe(designTokens.colors.neutral[50]);
    expect(themes.default.colors.text.primary).toBe(designTokens.colors.neutral[900]);

    expect(themes.dark.colors.background).toBe(designTokens.colors.neutral[900]);
    expect(themes.dark.colors.text.primary).toBe(designTokens.colors.neutral[100]);
  });
});

