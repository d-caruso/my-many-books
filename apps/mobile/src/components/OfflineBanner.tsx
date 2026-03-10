import React from 'react';
import { Banner, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNetworkState } from '../hooks/useNetworkState';

export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation('offline');
  const { isOnline } = useNetworkState();
  const theme = useTheme();

  if (isOnline) {
    return null;
  }

  return (
    <Banner
      visible={!isOnline}
      icon="wifi-off"
      style={{ backgroundColor: theme.colors.secondary }}
      testID="offline-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {t('banner.message')}
    </Banner>
  );
};
