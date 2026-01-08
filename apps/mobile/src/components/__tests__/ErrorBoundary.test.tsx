import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { errorTrackingService } from '../../services/errors/ErrorTrackingService';

// Mock React Native components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Button: ({ children, onPress, ...props }: any) => (
    <button onClick={onPress} {...props}>{children}</button>
  ),
}));

// Mock the error tracking service
jest.mock('../../services/errors/ErrorTrackingService', () => ({
  errorTrackingService: {
    trackError: jest.fn(),
    recordUserAction: jest.fn(),
    trackErrorRecovery: jest.fn(),
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string, options?: any) => {
      // Simple mock that returns default value or key
      if (defaultValue && options) {
        return defaultValue.replace(/\{\{(\w+)\}\}/g, (match, key) => options[key] || match);
      }
      return defaultValue || key;
    },
  }),
}));

// Create a component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Test content</Text>
      </ErrorBoundary>
    );

    expect(getByText('Test content')).toBeTruthy();
  });

  it('should render error UI when child component throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('The app encountered an unexpected error and needs to reload this section.')).toBeTruthy();
  });

  it('should track error when component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(errorTrackingService.trackError).toHaveBeenCalledWith(
      expect.any(Error),
      'REACT_NATIVE',
      expect.objectContaining({
        severity: 'high',
        source: 'react_error_boundary',
        additionalData: expect.objectContaining({
          componentStack: expect.any(String),
          errorBoundary: 'ErrorBoundary',
        }),
      })
    );
  });

  it('should call custom onError handler when provided', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should handle retry button press', () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error UI should be visible
    expect(getByText('Something went wrong')).toBeTruthy();

    // Press retry button
    const retryButton = getByText('Try Again');
    fireEvent.press(retryButton);

    // Should record user action and track recovery
    expect(errorTrackingService.recordUserAction).toHaveBeenCalledWith(
      'error_boundary_retry_pressed'
    );
    expect(errorTrackingService.trackErrorRecovery).toHaveBeenCalledWith(
      expect.any(Error),
      'error_boundary_retry',
      true,
      expect.objectContaining({
        additionalData: expect.objectContaining({
          retryAttempt: 1,
          retryMethod: 'state_reset',
        }),
      })
    );

    // Error UI should be hidden (component will re-render children)
    expect(queryByText('Something went wrong')).toBeFalsy();
  });

  it('should display error message and error ID', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Error: Test error')).toBeTruthy();
    expect(getByText(/Error ID: error_/)).toBeTruthy();
  });

  it('should handle show details button press', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const showDetailsButton = getByText('Show Details');
    fireEvent.press(showDetailsButton);

    expect(errorTrackingService.recordUserAction).toHaveBeenCalledWith(
      'error_boundary_details_expanded'
    );
  });

  it('should use custom fallback when provided', () => {
    const customFallback = (error: Error, errorInfo: any, retry: () => void) => (
      <Text>Custom error UI: {error.message}</Text>
    );

    const { getByText } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom error UI: Test error')).toBeTruthy();
  });

  it('should reset error state after successful retry', () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      React.useEffect(() => {
        // Simulate fixing the error after a short delay
        const timer = setTimeout(() => setShouldThrow(false), 100);
        return () => clearTimeout(timer);
      }, []);

      return <ThrowError shouldThrow={shouldThrow} />;
    };

    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Initially shows error
    expect(getByText('Something went wrong')).toBeTruthy();

    // Press retry
    const retryButton = getByText('Try Again');
    fireEvent.press(retryButton);

    // Error should be cleared
    expect(queryByText('Something went wrong')).toBeFalsy();
  });

  it('should handle multiple errors correctly', () => {
    const { rerender, getByText } = render(
      <ErrorBoundary>
        <Text>No error</Text>
      </ErrorBoundary>
    );

    // First error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(errorTrackingService.trackError).toHaveBeenCalledTimes(1);

    // Press retry
    fireEvent.press(getByText('Try Again'));

    // Second error (different component)
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(errorTrackingService.trackError).toHaveBeenCalledTimes(2);
  });
});