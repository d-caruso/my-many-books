import React from 'react';
import { StyleSheet } from 'react-native';
import { Badge, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useQueueStatus } from '../hooks/useQueueStatus';

/**
 * Badge showing pending sync operations count
 */
export const SyncQueueBadge: React.FC = () => {
  const { t } = useTranslation('offline');
  const { pendingCount } = useQueueStatus();
  const theme = useTheme();

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Badge
      style={[styles.badge, { backgroundColor: theme.colors.secondary }]}
      testID="sync-queue-badge"
      accessibilityRole="text"
      accessibilityLabel={`${pendingCount} ${t('sync.queue.syncing')}`}
    >
      {pendingCount}
    </Badge>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
