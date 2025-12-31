import React from 'react';
import { StyleSheet } from 'react-native';
import { Banner } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNetworkState } from '../hooks/useNetworkState';

export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation('offline');
  const { isOnline } = useNetworkState();

  if (isOnline) {
    return null;
  }

  return (
    <Banner
      visible={!isOnline}
      icon="wifi-off"
      style={styles.banner}
      testID="offline-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {t('banner.message')}
    </Banner>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFA726',
  },
});
