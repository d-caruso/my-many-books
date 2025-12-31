import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, Text, IconButton, Divider, Surface, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useQueueStatus } from '../hooks/useQueueStatus';
import { operationQueue } from '../services/OperationQueue';
import type { QueuedOperation } from '../types/queue';
import { useSyncQueue } from '../hooks/useSyncQueue';

/**
 * Screen for managing queued operations
 */
export const QueueManagementScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { operations, refreshQueue } = useQueueStatus();
  const { processQueue, performFullSync } = useSyncQueue();

  const handleRetry = async (operationId: string) => {
    await performFullSync();
    await refreshQueue();
  };

  const handleDiscard = async (operationId: string) => {
    await operationQueue.dequeue(operationId);
    await refreshQueue();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.primary;
      case 'retrying':
        return '#FF9800';
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.onSurface;
    }
  };

  const getOperationLabel = (operation: QueuedOperation) => {
    const { type, resource, payload } = operation;
    const title = payload?.title || payload?.id || t('offline.sync.queue.unknown_item');
    const operationType = t(`offline.sync.queue.operations.${type}`);
    const resourceType = t(`offline.sync.queue.resources.${resource}`);
    return `${operationType} ${resourceType}: ${title}`;
  };

  const renderOperation = ({ item }: { item: QueuedOperation }) => (
    <Surface style={styles.operationItem} elevation={1}>
      <List.Item
        title={getOperationLabel(item)}
        description={`${t('offline.sync.queue.status')}: ${t(`offline.sync.queue.statuses.${item.status}`)} | ${t('offline.sync.queue.retries')}: ${item.retryCount}/${item.maxRetries}`}
        left={(props) => (
          <List.Icon
            {...props}
            icon={item.status === 'failed' ? 'alert-circle' : 'sync'}
            color={getStatusColor(item.status)}
          />
        )}
        right={(props) => (
          <View style={styles.actions}>
            {(item.status === 'failed' || item.status === 'retrying') && (
              <IconButton
                icon="refresh"
                size={20}
                onPress={() => handleRetry(item.id)}
                testID={`retry-${item.id}`}
              />
            )}
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDiscard(item.id)}
              testID={`discard-${item.id}`}
            />
          </View>
        )}
      />
    </Surface>
  );

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {t('offline.sync.queue.title')}
      </Text>

      {operations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge">{t('offline.sync.queue.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={operations}
          renderItem={renderOperation}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Divider />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: 16,
  },
  operationItem: {
    marginBottom: 8,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
