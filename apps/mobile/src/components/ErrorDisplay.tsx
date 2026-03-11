import React from 'react';
import { View } from 'react-native';
import { Text, Button, Surface, useTheme } from 'react-native-paper';
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
  const { t } = useTranslation('offline');
  const theme = useTheme();

  if (!error) {
    return null;
  }

  const isValidationError = error.message?.includes('validation') ||
                           error.message?.includes('invalid');
  const isNetworkError = error.message?.includes('network') ||
                        error.message?.includes('offline') ||
                        error.message?.includes('connection');

  return (
    <Surface
      style={{
        margin: 16,
        padding: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.errorContainer,
      }}
      elevation={2}
    >
      <View style={{ marginBottom: 12 }}>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.error, fontWeight: 'bold', marginBottom: 8 }}
        >
          {isValidationError ? t('errors.validationError') :
           isNetworkError ? t('errors.networkError') : t('errors.generalError')}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
          {error.message}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        {onRetry && (
          <Button mode="contained" onPress={onRetry} style={{ marginLeft: 8 }}>
            {t('common.retry', 'Retry')}
          </Button>
        )}
        {onDismiss && (
          <Button mode="outlined" onPress={onDismiss} style={{ marginLeft: 8 }}>
            {t('common.dismiss', 'Dismiss')}
          </Button>
        )}
      </View>
    </Surface>
  );
};
