/**
 * Themed App Wrapper
 *
 * Wraps the app with MUI ThemeProvider
 * This component is lazy-loaded to defer MUI loading
 */

import React, { ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Create MUI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0369a1', // Darker blue for better contrast (WCAG AA compliant)
    },
    secondary: {
      main: '#64748b',
    },
    warning: {
      main: '#BA580D', // Darker orange for better contrast (WCAG AA compliant)
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563',
      disabled: '#6b7280', // Darker than default for WCAG AA compliance
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiChip: {
      styleOverrides: {
        colorWarning: {
          backgroundColor: '#BA580D', // Dark amber for WCAG AA compliance
          color: '#ffffff', // White text for maximum contrast
          '&:hover': {
            backgroundColor: '#92400e', // Darker on hover
          },
        },
      },
    },
  },
});

interface ThemedAppProps {
  children: ReactNode;
}

export const ThemedApp: React.FC<ThemedAppProps> = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
