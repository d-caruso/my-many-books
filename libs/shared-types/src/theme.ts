/**
 * Theme-related type definitions
 */

export type ThemeName = 'default' | 'dark' | 'bookish' | 'forest' | 'ocean' | 'sunset' | 'lavender';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    background: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
}