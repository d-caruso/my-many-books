import { ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { ErrorBoundary } from './ErrorBoundary';

interface AuthErrorBoundaryProps {
  children: ReactNode;
}

function AuthErrorFallback({ retry }: { retry: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleSignIn = () => {
    retry();
    router.replace('/auth');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.background }}>
      <Text variant="titleLarge" style={{ color: theme.colors.error, marginBottom: 12, textAlign: 'center' }}>
        {t('common:page_error_title')}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24, textAlign: 'center' }}>
        {t('common:page_error_message')}
      </Text>
      <Button mode="contained" onPress={retry} style={{ marginBottom: 12 }}>
        {t('common:retry')}
      </Button>
      <Button mode="outlined" onPress={handleSignIn}>
        {t('common:sign_in')}
      </Button>
    </View>
  );
}

export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(_error, _errorInfo, retry) => <AuthErrorFallback retry={retry} />}
    >
      {children}
    </ErrorBoundary>
  );
}
