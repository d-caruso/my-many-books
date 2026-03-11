import { QueueManagementScreen } from '../../src/components/QueueManagementScreen';
import { useQueueStatus } from '../../src/hooks/useQueueStatus';
import { operationQueue } from '../../src/services/OperationQueue';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-queue'),
}));

describe('QueueManagementScreen Component', () => {
  it('should export QueueManagementScreen component', () => {
    expect(QueueManagementScreen).toBeDefined();
    expect(typeof QueueManagementScreen).toBe('function');
  });

  it('should export useQueueStatus hook', () => {
    expect(useQueueStatus).toBeDefined();
    expect(typeof useQueueStatus).toBe('function');
  });

  it('should export operationQueue with dequeue method', () => {
    expect(operationQueue.dequeue).toBeDefined();
    expect(typeof operationQueue.dequeue).toBe('function');
  });
});
