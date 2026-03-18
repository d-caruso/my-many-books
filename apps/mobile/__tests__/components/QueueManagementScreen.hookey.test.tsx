/* eslint-disable @typescript-eslint/no-require-imports */

import React from 'react';
import renderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

import { QueueManagementScreen } from '../../src/components/QueueManagementScreen';
import { useQueueStatus } from '../../src/hooks/useQueueStatus';
import { useSyncQueue } from '../../src/hooks/useSyncQueue';
import { operationQueue } from '../../src/services/OperationQueue';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

jest.mock('../../src/hooks/useQueueStatus', () => ({
  useQueueStatus: jest.fn(),
}));

jest.mock('../../src/hooks/useSyncQueue', () => ({
  useSyncQueue: jest.fn(),
}));

jest.mock('../../src/services/OperationQueue', () => ({
  operationQueue: {
    retryOperation: jest.fn().mockResolvedValue(undefined),
    dequeue: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('../../src/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native', () => {
  const React = require('react');
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    FlatList: ({ data, renderItem }: { data: unknown[]; renderItem: ({ item }: { item: unknown }) => React.ReactNode }) => (
      <>
        {data.map((item, index) => (
          <React.Fragment key={String((item as { id?: string }).id ?? index)}>
            {renderItem({ item })}
          </React.Fragment>
        ))}
      </>
    ),
  };
});

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  return {
    List: {
      Item: ({ title, right }: { title: string; right?: () => React.ReactNode }) => (
        <View>
          <Text>{title}</Text>
          {right?.()}
        </View>
      ),
      Icon: () => null,
    },
    Text: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    IconButton: ({ testID, onPress }: { testID: string; onPress: () => void }) => (
      <TouchableOpacity testID={testID} onPress={onPress}>
        <Text>{testID}</Text>
      </TouchableOpacity>
    ),
    Divider: () => null,
    Surface: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    useTheme: () => ({
      colors: {
        primary: '#1',
        secondary: '#2',
        error: '#3',
        onSurface: '#4',
      },
    }),
  };
});

const mockUseQueueStatus = useQueueStatus as jest.MockedFunction<typeof useQueueStatus>;
const mockUseSyncQueue = useSyncQueue as jest.MockedFunction<typeof useSyncQueue>;
const mockOperationQueue = operationQueue as jest.Mocked<typeof operationQueue>;
const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;

describe('QueueManagementScreen hookey emits', () => {
  const refreshQueue = jest.fn().mockResolvedValue(undefined);
  const processQueue = jest.fn().mockResolvedValue(undefined);
  const queuedOperation = {
    id: 'op-1',
    type: 'UPDATE',
    resource: 'book',
    payload: { title: 'Queued Book' },
    status: 'failed',
    retryCount: 2,
    maxRetries: 5,
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueueStatus.mockReturnValue({
      operations: [queuedOperation],
      refreshQueue,
      loading: false,
      error: null,
    });
    mockUseSyncQueue.mockReturnValue({
      processQueue,
      performFullSync: jest.fn(),
      resumeSync: jest.fn(),
      isRetriableError: jest.fn(),
    });
  });

  it('emits queue.retry.manual when retrying a queued operation', async () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<QueueManagementScreen />);
    });

    await renderer.act(async () => {
      await tree.root.findByProps({ testID: 'retry-op-1' }).props.onPress();
    });

    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.QUEUE.RETRY_MANUAL,
      expect.objectContaining({
        operationId: 'op-1',
        operationType: 'UPDATE',
        resource: 'book',
        source: 'QueueManagementScreen.handleRetry',
      })
    );
    expect(mockOperationQueue.retryOperation).toHaveBeenCalledWith('op-1');
    expect(processQueue).toHaveBeenCalled();
    expect(refreshQueue).toHaveBeenCalled();
  });

  it('emits queue.discard.manual when discarding a queued operation', async () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<QueueManagementScreen />);
    });

    await renderer.act(async () => {
      await tree.root.findByProps({ testID: 'discard-op-1' }).props.onPress();
    });

    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.QUEUE.DISCARD_MANUAL,
      expect.objectContaining({
        operationId: 'op-1',
        operationType: 'UPDATE',
        resource: 'book',
        source: 'QueueManagementScreen.handleDiscard',
      })
    );
    expect(mockOperationQueue.dequeue).toHaveBeenCalledWith('op-1');
    expect(refreshQueue).toHaveBeenCalled();
  });
});
