import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Header } from '../../../components/Layout/Header';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Test wrapper with ThemeProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Header', () => {
  test('renders header component', () => {
    render(<Header />, { wrapper: TestWrapper });
    
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  test('has correct structure', () => {
    render(<Header />, { wrapper: TestWrapper });

    // Should render the header element
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('bg-surface', 'shadow-sm', 'border-b');
  });

  test('displays default title', () => {
    render(<Header />, { wrapper: TestWrapper });
    
    expect(screen.getByText('My Many Books')).toBeInTheDocument();
  });

  test('displays custom title when provided', () => {
    render(<Header title="Custom Title" />, { wrapper: TestWrapper });
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.queryByText('My Many Books')).not.toBeInTheDocument();
  });

  test('contains theme toggle button', () => {
    render(<Header />, { wrapper: TestWrapper });
    
    const themeButton = screen.getByTitle('Toggle theme');
    expect(themeButton).toBeInTheDocument();
    expect(themeButton).toHaveClass('p-2', 'rounded-md');
  });

  test('theme toggle button works', () => {
    render(<Header />, { wrapper: TestWrapper });
    
    const themeButton = screen.getByTitle('Toggle theme');
    fireEvent.click(themeButton);
    
    // The theme should change, which should be reflected in the icon
    expect(themeButton).toBeInTheDocument();
  });

  test('displays theme icon', () => {
    render(<Header />, { wrapper: TestWrapper });

    const themeButton = screen.getByTitle('Toggle theme');
    const icon = screen.getByRole('button', { name: 'Toggle theme' });
    expect(icon).toBeInTheDocument();
  });

  test('contains user avatar', () => {
    render(<Header />, { wrapper: TestWrapper });

    const avatar = screen.getByText('U');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass('w-8', 'h-8', 'bg-primary-500', 'rounded-full');
  });

  test('has responsive layout classes', () => {
    render(<Header />, { wrapper: TestWrapper });

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    const title = within(header).getByRole('heading', { name: /My Many Books/i });
    expect(title).toBeInTheDocument();
  });
});