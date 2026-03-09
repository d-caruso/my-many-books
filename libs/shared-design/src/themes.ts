// TODO: Unused — defined for future theme switching support across web and mobile.
// Neither web-app nor mobile currently consume this. When adopted, each platform
// will need to map these theme colors to its own UI framework (MUI / React Native Paper).

import { ThemeName, Theme } from '@my-many-books/shared-types';

export const themes: Record<ThemeName, Theme> = {
  default: {
    name: 'default',
    displayName: 'Default',
    colors: {
      primary: '#3B82F6',
      secondary: '#F3F4F6',
      accent: '#2563EB',
      surface: '#FFFFFF',
      background: '#F9FAFB',
      text: {
        primary: '#111827',
        secondary: '#4B5563',
        muted: '#9CA3AF',
      },
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
    },
  },

  dark: {
    name: 'dark',
    displayName: 'Dark Mode',
    colors: {
      primary: '#60A5FA',
      secondary: '#1F2937',
      accent: '#93C5FD',
      surface: '#111827',
      background: '#111827',
      text: {
        primary: '#F3F4F6',
        secondary: '#D1D5DB',
        muted: '#6B7280',
      },
      semantic: {
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#60A5FA',
      },
    },
  },

  bookish: {
    name: 'bookish',
    displayName: 'Bookish Brown',
    colors: {
      primary: '#8B4513',
      secondary: '#F5E6D3',
      accent: '#D2691E',
      surface: '#FFFEF7',
      background: '#FDF6E3',
      text: {
        primary: '#3C2415',
        secondary: '#5D4037',
        muted: '#8D6E63',
      },
      semantic: {
        success: '#2E7D32',
        warning: '#F57C00',
        error: '#C62828',
        info: '#1565C0',
      },
    },
  },

  forest: {
    name: 'forest',
    displayName: 'Forest Green',
    colors: {
      primary: '#2E7D32',
      secondary: '#E8F5E8',
      accent: '#388E3C',
      surface: '#FFFFFF',
      background: '#F1F8E9',
      text: {
        primary: '#1B5E20',
        secondary: '#2E7D32',
        muted: '#66BB6A',
      },
      semantic: {
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
    },
  },

  ocean: {
    name: 'ocean',
    displayName: 'Ocean Blue',
    colors: {
      primary: '#0277BD',
      secondary: '#E1F5FE',
      accent: '#0288D1',
      surface: '#FFFFFF',
      background: '#E3F2FD',
      text: {
        primary: '#01579B',
        secondary: '#0277BD',
        muted: '#4FC3F7',
      },
      semantic: {
        success: '#00BCD4',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
    },
  },

  sunset: {
    name: 'sunset',
    displayName: 'Sunset Orange',
    colors: {
      primary: '#E65100',
      secondary: '#FFF3E0',
      accent: '#F57C00',
      surface: '#FFFFFF',
      background: '#FFF8E1',
      text: {
        primary: '#BF360C',
        secondary: '#E65100',
        muted: '#FF9800',
      },
      semantic: {
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
    },
  },

  lavender: {
    name: 'lavender',
    displayName: 'Lavender Purple',
    colors: {
      primary: '#7B1FA2',
      secondary: '#F3E5F5',
      accent: '#8E24AA',
      surface: '#FFFFFF',
      background: '#FCE4EC',
      text: {
        primary: '#4A148C',
        secondary: '#7B1FA2',
        muted: '#BA68C8',
      },
      semantic: {
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
    },
  },
};
