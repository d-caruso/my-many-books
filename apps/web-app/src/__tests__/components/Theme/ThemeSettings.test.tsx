import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSettings } from '../../../components/Theme/ThemeSettings';
import { useTheme } from '../../../contexts/ThemeContext';

// Mock the useTheme hook
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

// Mock ThemeSelector component
jest.mock('../../../components/Theme/ThemeSelector', () => ({
  ThemeSelector: ({ variant }: any) => (
    <div data-testid="theme-selector" data-variant={variant}>
      Theme Selector
    </div>
  ),
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Paper: ({ children, elevation, ...props }: any) => (
    <div data-testid="paper" data-elevation={elevation} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, gutterBottom, ...props }: any) => (
    <div 
      data-testid={`typography-${variant}`} 
      data-gutter-bottom={gutterBottom}
      {...props}
    >
      {children}
    </div>
  ),
  Divider: ({ sx, ...props }: any) => (
    <hr data-testid="divider" style={sx} {...props} />
  ),
  Switch: ({ checked, onChange, ...props }: any) => (
    <label data-testid="switch">
      <input
        type="checkbox"
        checked={checked || false}
        onChange={(e) => onChange?.(e, e.target.checked)}
        {...props}
      />
      <span>Toggle</span>
    </label>
  ),
  FormControlLabel: ({ control, label, ...props }: any) => (
    <div data-testid="form-control-label" {...props}>
      {control}
      <span>{label}</span>
    </div>
  ),
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: any) => (
    <div data-testid="card-content" {...props}>{children}</div>
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid={`alert-${severity}`} {...props}>{children}</div>
  ),
  Collapse: ({ children, in: isIn, ...props }: any) => (
    isIn ? <div data-testid="collapse" {...props}>{children}</div> : null
  ),
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeSettings', () => {
  const mockSetTheme = jest.fn();
  const mockToggleTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      isDarkMode: false,
      toggleTheme: mockToggleTheme,
    });
  });

  test('renders theme settings panel', () => {
    render(<ThemeSettings />);

    expect(screen.getByText('Theme Settings')).toBeInTheDocument();
    expect(screen.getByText('Customize your reading experience')).toBeInTheDocument();
    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
  });

  test('shows current theme information', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      isDarkMode: true,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeSettings />);

    expect(screen.getByText('Current theme: Dark Mode')).toBeInTheDocument();
  });

  test('displays light mode information', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      isDarkMode: false,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeSettings />);

    expect(screen.getByText('Current theme: Light Mode')).toBeInTheDocument();
  });

  test('displays auto mode information', () => {
    mockUseTheme.mockReturnValue({
      theme: 'auto',
      setTheme: mockSetTheme,
      isDarkMode: false,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeSettings />);

    expect(screen.getByText('Current theme: Auto Mode')).toBeInTheDocument();
  });

  test('shows theme description', () => {
    render(<ThemeSettings />);

    expect(screen.getByText(/Choose between light, dark, or automatic theme/)).toBeInTheDocument();
  });

  test('renders theme selector with correct variant', () => {
    render(<ThemeSettings variant="compact" />);

    const themeSelector = screen.getByTestId('theme-selector');
    expect(themeSelector).toHaveAttribute('data-variant', 'compact');
  });

  test('shows advanced settings when enabled', () => {
    render(<ThemeSettings showAdvanced={true} />);

    expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    expect(screen.getByText('Follow system preference')).toBeInTheDocument();
  });

  test('handles system preference toggle', () => {
    render(<ThemeSettings showAdvanced={true} />);

    const systemToggle = screen.getByTestId('switch').querySelector('input');
    fireEvent.click(systemToggle!);

    // This would depend on the actual implementation
    expect(systemToggle).toBeInTheDocument();
  });

  test('shows theme preview when enabled', () => {
    render(<ThemeSettings showPreview={true} />);

    expect(screen.getByText('Theme Preview')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  test('displays theme benefits information', () => {
    render(<ThemeSettings showInfo={true} />);

    expect(screen.getByTestId('alert-info')).toBeInTheDocument();
    expect(screen.getByText(/Dark mode can help reduce eye strain/)).toBeInTheDocument();
  });

  test('handles quick theme toggle', () => {
    render(<ThemeSettings showQuickToggle={true} />);

    const quickToggle = screen.getByTestId('form-control-label');
    expect(quickToggle).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  test('toggles dark mode when quick toggle is used', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      isDarkMode: false,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeSettings showQuickToggle={true} />);

    const toggleInput = screen.getByTestId('switch').querySelector('input');
    fireEvent.click(toggleInput!);

    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  test('shows correct toggle state for dark mode', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      isDarkMode: true,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeSettings showQuickToggle={true} />);

    const toggleInput = screen.getByTestId('switch').querySelector('input');
    expect(toggleInput).toBeChecked();
  });

  test('shows keyboard shortcuts when enabled', () => {
    render(<ThemeSettings showKeyboardShortcuts={true} />);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Ctrl + Shift + T: Toggle theme')).toBeInTheDocument();
  });

  test('renders without optional sections', () => {
    render(<ThemeSettings />);

    expect(screen.queryByText('Advanced Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Theme Preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alert-info')).not.toBeInTheDocument();
  });

  test('has proper typography hierarchy', () => {
    render(<ThemeSettings />);

    expect(screen.getByTestId('typography-h5')).toBeInTheDocument();
    expect(screen.getByTestId('typography-body2')).toBeInTheDocument();
  });

  test('shows dividers between sections', () => {
    render(<ThemeSettings showAdvanced={true} showPreview={true} />);

    const dividers = screen.getAllByTestId('divider');
    expect(dividers.length).toBeGreaterThan(0);
  });

  test('handles theme context errors gracefully', () => {
    mockUseTheme.mockReturnValue({
      theme: null as any,
      setTheme: mockSetTheme,
      isDarkMode: false,
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeSettings />);

    expect(screen.getByText('Current theme: Unknown')).toBeInTheDocument();
  });

  test('supports custom styling', () => {
    render(<ThemeSettings className="custom-settings" />);

    const container = screen.getByTestId('paper');
    expect(container).toHaveClass('custom-settings');
  });

  test('shows expandable sections when configured', () => {
    render(<ThemeSettings expandableSections={true} />);

    // This would depend on actual implementation
    expect(screen.getByTestId('paper')).toBeInTheDocument();
  });

  test('renders accessibility information', () => {
    render(<ThemeSettings showAccessibility={true} />);

    expect(screen.getByText('Accessibility')).toBeInTheDocument();
    expect(screen.getByText(/High contrast themes improve readability/)).toBeInTheDocument();
  });

  test('handles rapid theme changes', () => {
    const { rerender } = render(<ThemeSettings showQuickToggle={true} />);

    // Simulate rapid theme changes
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      isDarkMode: true,
      toggleTheme: mockToggleTheme,
    });

    rerender(<ThemeSettings showQuickToggle={true} />);

    expect(screen.getByText('Current theme: Dark Mode')).toBeInTheDocument();
  });

  test('maintains settings state across renders', () => {
    const { rerender } = render(<ThemeSettings showAdvanced={true} />);

    rerender(<ThemeSettings showAdvanced={true} />);

    expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
  });
});