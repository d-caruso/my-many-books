import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message
}) => {
  const { t } = useTranslation();
  const displayMessage = message || t('loading');

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" style={styles.spinner} testID="loading" accessibilityLabel={t('loading')} />
      <Text variant="bodyMedium" style={styles.message} accessibilityLiveRegion="polite">
        {displayMessage}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    textAlign: 'center',
    opacity: 0.7,
  },
});