import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, IconButton, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { SyncStatus } from '@/types';

interface SyncStatusBadgeProps {
  syncStatus?: SyncStatus;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Badge showing sync status for individual books
 */
export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  syncStatus,
  onRetry,
  compact = false,
}) => {
  const { t } = useTranslation('offline');

  if (!syncStatus || syncStatus === 'synced') {
    return null;
  }

  const getBadgeColor = () => {
    switch (syncStatus) {
      case 'pending':
        return '#FF9800'; // Orange
      case 'failed':
        return '#F44336'; // Red
      default:
        return '#757575'; // Gray
    }
  };

  const getBadgeText = () => {
    switch (syncStatus) {
      case 'pending':
        return t('sync.badges.notSynced');
      case 'failed':
        return t('sync.badges.syncFailed');
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (syncStatus) {
      case 'pending':
        return 'cloud-upload-outline';
      case 'failed':
        return 'cloud-alert';
      default:
        return 'sync';
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <IconButton
          icon={getIcon()}
          size={16}
          iconColor={getBadgeColor()}
          onPress={syncStatus === 'failed' ? onRetry : undefined}
          testID={`sync-icon-${syncStatus}`}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Badge
        style={[styles.badge, { backgroundColor: getBadgeColor() }]}
        testID={`sync-badge-${syncStatus}`}
      >
        {getBadgeText()}
      </Badge>
      {syncStatus === 'failed' && onRetry && (
        <IconButton
          icon="refresh"
          size={16}
          onPress={onRetry}
          testID="sync-retry-button"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  compactContainer: {
    marginLeft: 4,
  },
  badge: {
    fontSize: 10,
    height: 20,
  },
});
