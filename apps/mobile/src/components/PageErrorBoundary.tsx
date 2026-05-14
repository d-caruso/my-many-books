import { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './ErrorBoundary';

interface PageErrorBoundaryProps {
  children: ReactNode;
  screenName?: string;
}

function PageErrorFallback({ retry }: { retry: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.background }}>
      <Text variant="titleLarge" style={{ color: theme.colors.error, marginBottom: 12, textAlign: 'center' }}>
        {t('common:page_error_title')}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24, textAlign: 'center' }}>
        {t('common:page_error_message')}
      </Text>
      <Button mode="contained" onPress={retry}>
        {t('common:retry')}
      </Button>
    </View>
  );
}

export function PageErrorBoundary({ children, screenName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, _errorInfo, retry) => {
        if (screenName) {
          console.error(`[PageErrorBoundary] ${screenName}:`, error);
        }
        return <PageErrorFallback retry={retry} />;
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
