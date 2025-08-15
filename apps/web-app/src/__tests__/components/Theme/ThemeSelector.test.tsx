import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSelector } from '../../../components/Theme/ThemeSelector';
import { useTheme } from '../../../contexts/ThemeContext';

// Mock the useTheme hook
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  FormControl: ({ children, size, variant, ...props }: any) => (
    <div data-testid="form-control" data-size={size} data-variant={variant} {...props}>
      {children}
    </div>
  ),
  InputLabel: ({ children, id, ...props }: any) => (
    <label data-testid="input-label" id={id} {...props}>{children}</label>
  ),
  Select: ({ children, value, onChange, labelId, label, ...props }: any) => (
    <div data-testid="select-container">
      <select
        data-testid="select"
        value={value || ''}
        onChange={(e) => onChange?.({ target: { value: e.target.value } })}
        data-label-id={labelId}
        aria-label={label}
        {...props}
      >
        {children}
      </select>
    </div>
  ),
  MenuItem: ({ children, value, ...props }: any) => (
    <option data-testid="menu-item" value={value} {...props}>{children}</option>
  ),
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, component, ...props }: any) => (
    <div data-testid={`typography-${variant}`} data-component={component} {...props}>
      {children}
    </div>
  ),
  Tooltip: ({ children, title, placement, ...props }: any) => (
    <div data-testid="tooltip" title={title} data-placement={placement} {...props}>
      {children}
    </div>
  ),
  IconButton: ({ children, onClick, color, size, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} data-color={color} data-size={size} {...props}>
      {children}
    </button>
  ),
}));

// Mock Material-UI icons
jest.mock('@mui/icons-material', () => ({
  LightMode: () => <div data-testid="light-mode-icon">Light</div>,
  DarkMode: () => <div data-testid="dark-mode-icon">Dark</div>,
  AutoMode: () => <div data-testid="auto-mode-icon">Auto</div>,
  Palette: () => <div data-testid="palette-icon">Palette</div>,
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('ThemeSelector', () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      isDarkMode: false,
      toggleTheme: jest.fn(),
    });
  });

  test('renders theme selector', () => {
    render(<ThemeSelector />);

    expect(screen.getByTestId('form-control')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByTestId('select')).toBeInTheDocument();
  });

  test('shows current theme selection', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      isDarkMode: true,
      toggleTheme: jest.fn(),
    });

    render(<ThemeSelector />);

    const select = screen.getByTestId('select');
    expect(select).toHaveValue('dark');
  });

  test('renders all theme options', () => {
    render(<ThemeSelector />);

    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  test('calls setTheme when selection changes', () => {
    render(<ThemeSelector />);

    const select = screen.getByTestId('select');
    fireEvent.change(select, { target: { value: 'dark' } });

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  test('handles light theme selection', () => {
    render(<ThemeSelector />);

    const select = screen.getByTestId('select');
    fireEvent.change(select, { target: { value: 'light' } });

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  test('handles auto theme selection', () => {
    render(<ThemeSelector />);

    const select = screen.getByTestId('select');
    fireEvent.change(select, { target: { value: 'auto' } });

    expect(mockSetTheme).toHaveBeenCalledWith('auto');
  });

  test('has proper accessibility attributes', () => {
    render(<ThemeSelector />);

    const select = screen.getByTestId('select');
    expect(select).toHaveAttribute('aria-label', 'Theme');

    const label = screen.getByTestId('input-label');
    expect(label).toBeInTheDocument();
  });

  test('handles rapid theme switching', () => {
    render(<ThemeSelector />);

    const select = screen.getByTestId('select');
    
    fireEvent.change(select, { target: { value: 'dark' } });
    fireEvent.change(select, { target: { value: 'auto' } });
    fireEvent.change(select, { target: { value: 'light' } });

    expect(mockSetTheme).toHaveBeenCalledTimes(3);
    expect(mockSetTheme).toHaveBeenNthCalledWith(1, 'dark');
    expect(mockSetTheme).toHaveBeenNthCalledWith(2, 'auto');
    expect(mockSetTheme).toHaveBeenNthCalledWith(3, 'light');
  });

  test('maintains state consistency', () => {
    const { rerender } = render(<ThemeSelector />);

    // Simulate theme change
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      isDarkMode: true,
      toggleTheme: jest.fn(),
    });

    rerender(<ThemeSelector />);

    const select = screen.getByTestId('select');
    expect(select).toHaveValue('dark');
  });
});