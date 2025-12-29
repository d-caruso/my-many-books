import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Display error messages with retry/dismiss actions
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  const isValidationError = error.message?.includes('validation') ||
                           error.message?.includes('invalid');
  const isNetworkError = error.message?.includes('network') ||
                        error.message?.includes('offline') ||
                        error.message?.includes('connection');

  return (
    <Surface style={styles.container} elevation={2}>
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.title}>
          {isValidationError ? 'Validation Error' :
           isNetworkError ? 'Network Error' : 'Error'}
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          {error.message}
        </Text>
      </View>
      <View style={styles.actions}>
        {onRetry && (
          <Button mode="contained" onPress={onRetry} style={styles.button}>
            {t('common.retry', 'Retry')}
          </Button>
        )}
        {onDismiss && (
          <Button mode="outlined" onPress={onDismiss} style={styles.button}>
            {t('common.dismiss', 'Dismiss')}
          </Button>
        )}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  content: {
    marginBottom: 12,
  },
  title: {
    color: '#C62828',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    color: '#424242',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    marginLeft: 8,
  },
});
