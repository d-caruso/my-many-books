import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { SyncStatus } from '@/types';
import { SYNC_STATUS } from '@/types';

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

  if (!syncStatus || syncStatus === SYNC_STATUS.SYNCED) {
    return null;
  }

  const getBadgeColor = () => {
    switch (syncStatus) {
      case SYNC_STATUS.PENDING:
        return '#FF9800'; // Orange
      case SYNC_STATUS.SYNCING:
        return '#2196F3'; // Blue
      case SYNC_STATUS.FAILED:
        return '#F44336'; // Red
      default:
        return '#757575'; // Gray
    }
  };

  const getBadgeText = () => {
    switch (syncStatus) {
      case SYNC_STATUS.PENDING:
        return t('sync.badges.notSynced');
      case SYNC_STATUS.SYNCING:
        return t('sync.badges.syncing');
      case SYNC_STATUS.FAILED:
        return t('sync.badges.syncFailed');
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (syncStatus) {
      case SYNC_STATUS.PENDING:
        return 'cloud-upload-outline';
      case SYNC_STATUS.SYNCING:
        return 'sync';
      case SYNC_STATUS.FAILED:
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
          onPress={syncStatus === SYNC_STATUS.FAILED ? onRetry : undefined}
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
      {syncStatus === SYNC_STATUS.FAILED && onRetry && (
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
