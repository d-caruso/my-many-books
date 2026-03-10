import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { errorTrackingService } from '../services/errors/ErrorTrackingService';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Global error boundary that catches React errors and integrates with hookey error tracking
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Track the error with comprehensive context
    errorTrackingService.trackError(error, 'REACT_NATIVE', {
      severity: 'high',
      source: 'react_error_boundary',
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      }
    });

    // Store error info for display
    this.setState({
      errorInfo,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Record user action
    errorTrackingService.recordUserAction('error_boundary_retry_pressed');

    // Attempt recovery
    if (this.state.error) {
      errorTrackingService.trackErrorRecovery(
        this.state.error,
        'error_boundary_retry',
        true,
        {
          additionalData: {
            retryAttempt: 1,
            retryMethod: 'state_reset'
          }
        }
      );
    }

    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.handleRetry
        );
      }

      // Default error UI
      return <DefaultErrorFallback 
        error={this.state.error}
        errorId={this.state.errorId}
        onRetry={this.handleRetry}
      />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component with translation support
 */
function DefaultErrorFallback({
  error,
  errorId,
  onRetry
}: {
  error: Error;
  errorId: string | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation('errors');
  const theme = useTheme();

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.error,
        marginBottom: 16,
        textAlign: 'center',
      }}>
        {t('boundary.title', 'Something went wrong')}
      </Text>

      <Text style={{
        fontSize: 16,
        color: theme.colors.onSurfaceVariant,
        marginBottom: 8,
        textAlign: 'center',
      }}>
        {t('boundary.message', 'The app encountered an unexpected error and needs to reload this section.')}
      </Text>

      <Text style={{
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
        marginBottom: 24,
        textAlign: 'center',
      }}>
        {t('boundary.errorDetails', 'Error: {{message}}', { message: error.message })}
      </Text>

      {errorId && (
        <Text style={{
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
          marginBottom: 24,
          textAlign: 'center',
          fontFamily: 'monospace',
        }}>
          {t('boundary.errorId', 'Error ID: {{errorId}}', { errorId })}
        </Text>
      )}

      <Button
        mode="contained"
        onPress={onRetry}
        style={{ marginBottom: 16 }}
      >
        {t('boundary.retry', 'Try Again')}
      </Button>

      <TouchableOpacity
        onPress={() => {
          errorTrackingService.recordUserAction('error_boundary_details_expanded');
        }}
        style={{
          padding: 8,
          borderRadius: 4,
          backgroundColor: theme.colors.surfaceVariant,
        }}
      >
        <Text style={{
          fontSize: 12,
          color: theme.colors.onSurfaceVariant,
        }}>
          {t('boundary.showDetails', 'Show Details')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}