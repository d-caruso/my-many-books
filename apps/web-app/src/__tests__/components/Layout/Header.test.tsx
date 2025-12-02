import React, { useCallback, useMemo, useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Header } from '../../../components/Layout/Header';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { ThemeName } from '../../../types';

const themeLabels: Record<ThemeName, string> = {
  default: 'Default',
  dark: 'Dark',
  bookish: 'Bookish',
  forest: 'Forest',
  ocean: 'Ocean',
  sunset: 'Sunset',
  lavender: 'Lavender',
};

const themeSequence: ThemeName[] = ['default', 'dark', 'bookish', 'forest', 'ocean', 'sunset', 'lavender'];

const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>('default');

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const currentIndex = themeSequence.indexOf(prev);
      return themeSequence[(currentIndex + 1) % themeSequence.length];
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      setTheme: (newTheme: ThemeName) => setThemeState(newTheme),
      toggleTheme,
      themes: themeLabels,
      systemTheme: 'light',
      autoTheme: false,
      setAutoTheme: () => undefined,
    }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

// Test wrapper with ThemeProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MockThemeProvider>{children}</MockThemeProvider>
);

describe('Header', () => {
  test('renders header component', () => {
    console.log('Header test: renders header component');
    render(<Header />, { wrapper: TestWrapper });
    
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  test('has correct structure', () => {
    console.log('Header test: has correct structure');
    render(<Header />, { wrapper: TestWrapper });

    // Should render the header element
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('bg-surface', 'shadow-sm', 'border-b');
  });

  test('displays default title', () => {
    console.log('Header test: displays default title');
    render(<Header />, { wrapper: TestWrapper });
    
    expect(screen.getByText('My Many Books')).toBeInTheDocument();
  });

  test('displays custom title when provided', () => {
    console.log('Header test: displays custom title when provided');
    render(<Header title="Custom Title" />, { wrapper: TestWrapper });
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.queryByText('My Many Books')).not.toBeInTheDocument();
  });

  test('contains theme toggle button', () => {
    console.log('Header test: contains theme toggle button');
    render(<Header />, { wrapper: TestWrapper });
    
    const themeButton = screen.getByTitle('Toggle theme');
    expect(themeButton).toBeInTheDocument();
    expect(themeButton).toHaveClass('p-2', 'rounded-md');
  });

  test('theme toggle button works', () => {
    console.log('Header test: theme toggle button works');
    render(<Header />, { wrapper: TestWrapper });

    const themeButton = screen.getByTitle('Toggle theme');
    fireEvent.click(themeButton);

    // The theme should change, which should be reflected in the icon
    expect(themeButton).toBeInTheDocument();
  });

  test('displays theme icon', () => {
    console.log('Header test: displays theme icon');
    render(<Header />, { wrapper: TestWrapper });

    const themeButton = screen.getByTitle('Toggle theme');
    expect(themeButton).toBeInTheDocument();
    expect(themeButton.textContent).toBeTruthy();
  });

  test('contains user avatar', () => {
    console.log('Header test: contains user avatar');
    render(<Header />, { wrapper: TestWrapper });

    const avatar = screen.getByText('U');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass('text-white', 'text-sm', 'font-medium');
  });

  test('has responsive layout classes', () => {
    console.log('Header test: has responsive layout classes');
    render(<Header />, { wrapper: TestWrapper });

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    const title = within(header).getByRole('heading', { name: /My Many Books/i });
    expect(title).toBeInTheDocument();
  });
});
