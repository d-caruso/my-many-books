import { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './ErrorBoundary';

interface ScannerErrorBoundaryProps {
  children: ReactNode;
  onClose?: () => void;
}

function getScannerErrorMessage(error: Error, t: (key: string) => string): string {
  const msg = error.message;
  if (msg.includes('Permission') || msg.includes('permission')) {
    return t('scanner:error_permission_denied');
  }
  if (msg.includes('NotFoundError') || msg.includes('no camera')) {
    return t('scanner:error_no_camera');
  }
  if (msg.includes('NotReadableError') || msg.includes('in use')) {
    return t('scanner:error_camera_in_use');
  }
  return t('scanner:error_generic');
}

function ScannerErrorFallback({
  error,
  retry,
  onClose,
}: {
  error: Error;
  retry: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.background }}>
      <Text variant="titleLarge" style={{ color: theme.colors.error, marginBottom: 12, textAlign: 'center' }}>
        {t('scanner:error_title')}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24, textAlign: 'center' }}>
        {getScannerErrorMessage(error, t)}
      </Text>
      <Button mode="contained" onPress={retry} style={{ marginBottom: 12 }}>
        {t('common:retry')}
      </Button>
      {onClose && (
        <Button mode="outlined" onPress={onClose}>
          {t('scanner:error_close')}
        </Button>
      )}
    </View>
  );
}

export function ScannerErrorBoundary({ children, onClose }: ScannerErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, _errorInfo, retry) => (
        <ScannerErrorFallback error={error} retry={retry} onClose={onClose} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
