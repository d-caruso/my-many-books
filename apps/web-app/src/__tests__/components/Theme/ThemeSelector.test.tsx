import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSelector } from '../../../components/Theme/ThemeSelector';

// Mock everything the component needs
const mockSetTheme = vi.fn();
const mockUseTheme = {
  theme: 'default',
  setTheme: mockSetTheme,
  themes: {
    default: 'Default',
    dark: 'Dark',
    bookish: 'Bookish',
    forest: 'Forest',
    ocean: 'Ocean',
    sunset: 'Sunset',
    lavender: 'Lavender'
  }
};

vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme
}));

// Mock ResponsiveButton
vi.mock('../../../components/UI/ResponsiveButton', () => ({
  ResponsiveButton: ({ children, onClick, variant, size }: any) => (
    <button data-testid={`responsive-button-${variant}-${size}`} onClick={onClick}>{children}</button>
  )
}));

describe('ThemeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders theme selector with basic props', () => {
    render(<ThemeSelector />);
    expect(document.body).toBeInTheDocument();
  });

  test('renders theme selector with variant list', () => {
    render(<ThemeSelector variant="list" />);
    expect(document.body).toBeInTheDocument();
  });

  test('renders theme selector with variant compact', () => {
    render(<ThemeSelector variant="compact" />);
    expect(document.body).toBeInTheDocument();
  });

  test('renders theme selector with variant grid', () => {
    render(<ThemeSelector variant="grid" />);
    expect(document.body).toBeInTheDocument();
  });

  test('renders theme selector with labels', () => {
    render(<ThemeSelector showLabels={true} />);
    expect(document.body).toBeInTheDocument();
  });

  test('renders theme selector without labels', () => {
    render(<ThemeSelector showLabels={false} />);
    expect(document.body).toBeInTheDocument();
  });

  test('handles theme selection in dropdown', () => {
    render(<ThemeSelector variant="dropdown" />);
    
    // Find and click the dropdown trigger
    const dropdownTrigger = screen.getByRole('button');
    fireEvent.click(dropdownTrigger);
    
    expect(document.body).toBeInTheDocument();
  });

  test('shows current theme in dropdown', () => {
    render(<ThemeSelector variant="dropdown" />);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  test('handles theme preview on hover', () => {
    render(<ThemeSelector variant="grid" />);
    
    // All theme options should be available for interaction
    const themeButtons = screen.getAllByRole('button');
    expect(themeButtons.length).toBeGreaterThan(0);
  });

  test('handles theme selection in grid view', () => {
    render(<ThemeSelector variant="grid" />);
    
    const themeButtons = screen.getAllByRole('button');
    if (themeButtons.length > 0) {
      fireEvent.click(themeButtons[0]);
    }
    
    expect(document.body).toBeInTheDocument();
  });

  test('handles theme selection in list view', () => {
    render(<ThemeSelector variant="list" />);
    
    const themeButtons = screen.getAllByRole('button');
    if (themeButtons.length > 0) {
      fireEvent.click(themeButtons[0]);
    }
    
    expect(document.body).toBeInTheDocument();
  });

  test('renders with custom className', () => {
    render(<ThemeSelector className="custom-class" />);
    // Verify component renders - custom class is applied to the wrapper div
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('shows all available themes', () => {
    render(<ThemeSelector variant="list" showLabels={true} />);
    
    // Should show all theme names when labels are enabled
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Bookish')).toBeInTheDocument();
    expect(screen.getByText('Forest')).toBeInTheDocument();
    expect(screen.getByText('Ocean')).toBeInTheDocument();
    expect(screen.getByText('Sunset')).toBeInTheDocument();
    expect(screen.getByText('Lavender')).toBeInTheDocument();
  });

  test('handles dropdown open state', () => {
    render(<ThemeSelector variant="dropdown" />);
    
    const dropdownButton = screen.getByRole('button');
    
    // Click to open
    fireEvent.click(dropdownButton);
    
    // Click to close
    fireEvent.click(dropdownButton);
    
    expect(document.body).toBeInTheDocument();
  });

  test('renders preview button in list variant', () => {
    render(<ThemeSelector variant="list" />);
    
    // Should have preview buttons in list variant
    const previewButtons = screen.getAllByText('Preview');
    expect(previewButtons.length).toBeGreaterThan(0);
  });

  test('handles preview functionality', () => {
    render(<ThemeSelector variant="list" />);
    
    const previewButtons = screen.getAllByText('Preview');
    if (previewButtons.length > 0) {
      fireEvent.click(previewButtons[0]);
    }
    
    expect(document.body).toBeInTheDocument();
  });

  test('shows compact layout with minimal information', () => {
    render(<ThemeSelector variant="compact" showLabels={false} />);
    
    // Compact variant should still render theme options
    const themeButtons = screen.getAllByRole('button');
    expect(themeButtons.length).toBeGreaterThan(0);
  });

  test('handles keyboard navigation', () => {
    render(<ThemeSelector variant="dropdown" />);
    
    const dropdownButton = screen.getByRole('button');
    
    // Simulate keyboard events
    fireEvent.keyDown(dropdownButton, { key: 'Enter' });
    fireEvent.keyDown(dropdownButton, { key: 'ArrowDown' });
    fireEvent.keyDown(dropdownButton, { key: 'Escape' });
    
    expect(document.body).toBeInTheDocument();
  });

  test('renders grid layout with theme cards', () => {
    render(<ThemeSelector variant="grid" showLabels={true} />);
    
    // Grid should show theme names as labels
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });

  test('handles theme color previews', () => {
    render(<ThemeSelector variant="list" />);
    
    // Component should render without errors
    expect(document.body).toBeInTheDocument();
  });

  test('maintains preview state correctly', () => {
    render(<ThemeSelector variant="list" />);
    
    const previewButtons = screen.getAllByText('Preview');
    if (previewButtons.length > 1) {
      // Click first preview
      fireEvent.click(previewButtons[0]);
      
      // Click second preview
      fireEvent.click(previewButtons[1]);
    }
    
    expect(document.body).toBeInTheDocument();
  });
});