import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeSelector } from '../ThemeSelector';
import { useTheme } from '../../../contexts/ThemeContext';

// Mock the useTheme hook
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const defaultThemeContext = {
  theme: 'default' as const,
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
  themes: {
    default: 'Default',
    dark: 'Dark',
    bookish: 'Bookish',
    forest: 'Forest',
    ocean: 'Ocean',
    sunset: 'Sunset',
    lavender: 'Lavender'
  },
  systemTheme: 'light' as const,
  autoTheme: false,
  setAutoTheme: jest.fn(),
};

describe('ThemeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(defaultThemeContext);
  });

  describe('dropdown variant', () => {
    test('renders dropdown with current theme', () => {
      mockUseTheme.mockReturnValue({
        ...defaultThemeContext,
        theme: 'dark'
      });

      render(<ThemeSelector variant="dropdown" />);
      
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    test('opens dropdown when clicked', () => {
      render(<ThemeSelector variant="dropdown" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getAllByText('Default')).toHaveLength(2); // Button text + dropdown option
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Bookish')).toBeInTheDocument();
    });

    test('closes dropdown when backdrop is clicked', async () => {
      render(<ThemeSelector variant="dropdown" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Dropdown should be open
      expect(screen.getByText('Bookish')).toBeInTheDocument();
      
      // Click backdrop
      const backdrop = document.querySelector('.fixed.inset-0');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop!);
      
      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByText('Bookish')).not.toBeInTheDocument();
      });
    });

    test('calls setTheme when theme is selected', () => {
      const mockSetTheme = jest.fn();
      mockUseTheme.mockReturnValue({
        ...defaultThemeContext,
        setTheme: mockSetTheme
      });

      render(<ThemeSelector variant="dropdown" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const forestOption = screen.getByText('Forest');
      fireEvent.click(forestOption);
      
      expect(mockSetTheme).toHaveBeenCalledWith('forest');
    });

    test('hides labels when showLabels is false', () => {
      render(<ThemeSelector variant="dropdown" showLabels={false} />);
      
      expect(screen.queryByText('Default')).not.toBeInTheDocument();
    });
  });

  describe('grid variant', () => {
    test('renders all themes in grid layout', () => {
      render(<ThemeSelector variant="grid" />);
      
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Forest')).toBeInTheDocument();
      expect(screen.getByText('Ocean')).toBeInTheDocument();
      expect(screen.getByText('Sunset')).toBeInTheDocument();
      expect(screen.getByText('Lavender')).toBeInTheDocument();
    });

    test('highlights current theme in grid', () => {
      mockUseTheme.mockReturnValue({
        ...defaultThemeContext,
        theme: 'ocean'
      });

      render(<ThemeSelector variant="grid" />);
      
      const oceanButton = screen.getByText('Ocean').closest('button');
      expect(oceanButton).toHaveClass('border-primary-500', 'bg-primary-50');
    });

    test('calls setTheme when grid item is clicked', () => {
      const mockSetTheme = jest.fn();
      mockUseTheme.mockReturnValue({
        ...defaultThemeContext,
        setTheme: mockSetTheme
      });

      render(<ThemeSelector variant="grid" />);
      
      const sunsetButton = screen.getByText('Sunset').closest('button');
      fireEvent.click(sunsetButton!);
      
      expect(mockSetTheme).toHaveBeenCalledWith('sunset');
    });
  });

  describe('list variant', () => {
    test('renders all themes in list layout', () => {
      render(<ThemeSelector variant="list" />);
      
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getAllByText('Preview')).toHaveLength(7); // One for each theme
      expect(screen.getAllByText(/Select|Active/)).toHaveLength(7);
    });

    test('shows active theme correctly', () => {
      mockUseTheme.mockReturnValue({
        ...defaultThemeContext,
        theme: 'lavender'
      });

      render(<ThemeSelector variant="list" />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      
      // Other themes should show "Select"
      const selectButtons = screen.getAllByText('Select');
      expect(selectButtons).toHaveLength(6);
    });

    test('calls setTheme when select button is clicked', () => {
      const mockSetTheme = jest.fn();
      mockUseTheme.mockReturnValue({
        ...defaultThemeContext,
        setTheme: mockSetTheme
      });

      render(<ThemeSelector variant="list" />);
      
      // Find the select button for dark theme
      const selectButtons = screen.getAllByText('Select');
      fireEvent.click(selectButtons[0]); // Assuming this is the dark theme
      
      expect(mockSetTheme).toHaveBeenCalled();
    });

    test('preview functionality works', async () => {
      // Mock document.documentElement.setAttribute
      const mockSetAttribute = jest.fn();
      Object.defineProperty(document.documentElement, 'setAttribute', {
        value: mockSetAttribute
      });

      render(<ThemeSelector variant="list" />);
      
      const previewButtons = screen.getAllByText('Preview');
      fireEvent.click(previewButtons[0]); // Preview first theme
      
      expect(mockSetAttribute).toHaveBeenCalled();
      
      // Should show "Previewing..." text
      expect(screen.getByText('Previewing...')).toBeInTheDocument();
    });
  });

  test('applies custom className', () => {
    render(
      <div data-testid="theme-selector-container">
        <ThemeSelector 
          variant="dropdown" 
          className="custom-theme-selector"
        />
      </div>
    );
    
    const container = screen.getByTestId('theme-selector-container');
    expect(container.firstChild).toHaveClass('custom-theme-selector');
  });

  test('renders theme preview colors correctly', () => {
    render(<ThemeSelector variant="grid" />);
    
    // Check that color preview div elements are rendered
    const colorPreviewContainers = document.querySelectorAll('.flex.space-x-1');
    expect(colorPreviewContainers.length).toBeGreaterThan(0);
  });
});