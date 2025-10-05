import React from 'react';
import { render, screen } from '@testing-library/react';
import { useTheme, ThemeProvider } from '../../hooks/../contexts/ThemeContext';

// Simple test component that uses useTheme
const TestComponent = () => {
  const { theme, themes } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="themes-count">{Object.keys(themes).length}</span>
    </div>
  );
};

describe('useTheme (simplified)', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Mock matchMedia with a complete implementation
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  test('provides theme context', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toBeInTheDocument();
    expect(screen.getByTestId('themes-count')).toHaveTextContent('7'); // We have 7 themes
  });

  test('throws error when used outside provider', () => {
    // Mock console.error to suppress error output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );

    consoleSpy.mockRestore();
  });
});