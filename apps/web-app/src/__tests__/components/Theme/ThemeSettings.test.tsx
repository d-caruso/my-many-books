import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSettings } from '../../../components/Theme/ThemeSettings';

// Mock ThemeSelector component
jest.mock('../../../components/Theme/ThemeSelector', () => ({
  ThemeSelector: ({ variant, showLabels }: any) => (
    <div data-testid="theme-selector" data-variant={variant} data-show-labels={showLabels}>
      Theme Selector
    </div>
  )
}));

// Mock useTheme context
const mockSetAutoTheme = jest.fn();
const mockUseTheme = {
  currentTheme: 'light',
  autoTheme: false,
  setAutoTheme: mockSetAutoTheme
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme
}));

describe('ThemeSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders theme settings component', () => {
    render(<ThemeSettings />);
    
    expect(screen.getByText('Theme Settings')).toBeInTheDocument();
    expect(screen.getByText('Customize the appearance of your reading experience')).toBeInTheDocument();
  });

  test('renders auto theme toggle', () => {
    render(<ThemeSettings />);
    
    expect(screen.getByText('Auto (System)')).toBeInTheDocument();
    expect(screen.getByText('Automatically switch between themes based on your system preference')).toBeInTheDocument();
  });

  test('renders theme selector', () => {
    render(<ThemeSettings />);
    
    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
  });

  test('handles auto theme toggle', () => {
    render(<ThemeSettings />);
    
    const enableButton = screen.getByText('Enable');
    fireEvent.click(enableButton);
    
    expect(mockSetAutoTheme).toHaveBeenCalledWith(true);
  });

  test('shows enabled state when auto theme is active', () => {
    mockUseTheme.autoTheme = true;
    
    render(<ThemeSettings />);
    
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  test('renders with all props', () => {
    render(<ThemeSettings showAdvanced={true} className="custom-class" />);
    
    expect(screen.getByText('Theme Settings')).toBeInTheDocument();
  });

  test('renders without advanced settings by default', () => {
    render(<ThemeSettings />);
    
    expect(screen.queryByText('Advanced Settings')).not.toBeInTheDocument();
  });
});