import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, Text, IconButton, Divider, Surface, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useQueueStatus } from '../hooks/useQueueStatus';
import { operationQueue } from '../services/OperationQueue';
import type { QueuedOperation } from '../types/queue';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { QUEUE_OPERATION_STATUS } from '@/services/hooks';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

/**
 * Screen for managing queued operations
 */
export const QueueManagementScreen: React.FC = () => {
  const { t } = useTranslation('offline');
  const theme = useTheme();
  const { operations, refreshQueue } = useQueueStatus();
  const { processQueue } = useSyncQueue();

  const handleRetry = async (operation: QueuedOperation) => {
    mobileHooks.emit(MOBILE_EVENTS.QUEUE.RETRY_MANUAL, {
      operationId: operation.id,
      operationType: operation.type,
      resource: operation.resource,
      status: operation.status,
      retryCount: operation.retryCount,
      source: 'QueueManagementScreen.handleRetry',
    });

    await operationQueue.retryOperation(operation.id);
    await processQueue(); // Process the queue to attempt the retry
    await refreshQueue();
  };

  const handleDiscard = async (operation: QueuedOperation) => {
    mobileHooks.emit(MOBILE_EVENTS.QUEUE.DISCARD_MANUAL, {
      operationId: operation.id,
      operationType: operation.type,
      resource: operation.resource,
      status: operation.status,
      retryCount: operation.retryCount,
      source: 'QueueManagementScreen.handleDiscard',
    });

    await operationQueue.dequeue(operation.id);
    await refreshQueue();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case QUEUE_OPERATION_STATUS.PENDING:
        return theme.colors.primary;
      case QUEUE_OPERATION_STATUS.RETRYING:
        return theme.colors.secondary;
      case QUEUE_OPERATION_STATUS.FAILED:
        return theme.colors.error;
      default:
        return theme.colors.onSurface;
    }
  };

  const getOperationLabel = (operation: QueuedOperation) => {
    const { type, resource, payload } = operation;
    const title = ('title' in payload && payload.title) || payload?.id || t('sync.queue.unknown_item');
    const operationType = t(`sync.queue.operations.${type}`);
    const resourceType = t(`sync.queue.resources.${resource}`);
    return `${operationType} ${resourceType}: ${title}`;
  };

  const renderOperation = ({ item }: { item: QueuedOperation }) => (
    <Surface style={styles.operationItem} elevation={1}>
      <List.Item
        title={getOperationLabel(item)}
        description={`${t('sync.queue.status')}: ${t(`sync.queue.statuses.${item.status}`)} | ${t('sync.queue.retries')}: ${item.retryCount}/${item.maxRetries}`}
        left={(props) => (
          <List.Icon
            {...props}
            icon={item.status === QUEUE_OPERATION_STATUS.FAILED ? 'alert-circle' : 'sync'}
            color={getStatusColor(item.status)}
          />
        )}
        right={() => (
          <View style={styles.actions}>
            {(item.status === QUEUE_OPERATION_STATUS.FAILED || item.status === QUEUE_OPERATION_STATUS.RETRYING) && (
              <IconButton
                icon="refresh"
                size={20}
                onPress={() => handleRetry(item)}
                testID={`retry-${item.id}`}
              />
            )}
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDiscard(item)}
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
        {t('sync.queue.title')}
      </Text>

      {operations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge">{t('sync.queue.empty')}</Text>
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
