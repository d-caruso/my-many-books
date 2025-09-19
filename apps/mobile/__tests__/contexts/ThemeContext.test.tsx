import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// Mock AsyncStorage
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Test component that uses theme
const TestThemeComponent = () => {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <>
      <text testID="theme-status">{isDark ? 'dark' : 'light'}</text>
      <text testID="toggle-button" onPress={toggleTheme}>Toggle Theme</text>
    </>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  it('should provide default light theme', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    expect(getByTestId('theme-status')).toHaveTextContent('light');
  });

  it('should toggle between light and dark themes', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    // Should start with light theme
    expect(getByTestId('theme-status')).toHaveTextContent('light');

    // Toggle to dark
    fireEvent.press(getByTestId('toggle-button'));
    expect(getByTestId('theme-status')).toHaveTextContent('dark');

    // Toggle back to light
    fireEvent.press(getByTestId('toggle-button'));
    expect(getByTestId('theme-status')).toHaveTextContent('light');
  });

  it('should persist theme preference', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    // Toggle to dark theme
    fireEvent.press(getByTestId('toggle-button'));

    // Should save to AsyncStorage
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should restore theme preference from storage', async () => {
    // Mock stored dark theme
    mockAsyncStorage.getItem.mockResolvedValue('dark');

    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    // Should restore dark theme
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(getByTestId('theme-status')).toHaveTextContent('dark');
  });

  it('should handle storage errors gracefully', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    // Should fall back to default light theme
    expect(getByTestId('theme-status')).toHaveTextContent('light');
  });

  it('should handle invalid stored theme', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('invalid-theme');

    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    // Should fall back to default light theme
    expect(getByTestId('theme-status')).toHaveTextContent('light');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestThemeComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    console.error = originalError;
  });
});
