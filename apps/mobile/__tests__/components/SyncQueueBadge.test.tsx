import { SyncQueueBadge } from '../../src/components/SyncQueueBadge';
import { useQueueStatus } from '../../src/hooks/useQueueStatus';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-badge'),
}));

describe('SyncQueueBadge Component', () => {
  it('should export SyncQueueBadge component', () => {
    expect(SyncQueueBadge).toBeDefined();
    expect(typeof SyncQueueBadge).toBe('function');
  });

  it('should export useQueueStatus hook', () => {
    expect(useQueueStatus).toBeDefined();
    expect(typeof useQueueStatus).toBe('function');
  });
});
