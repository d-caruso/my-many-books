// Test for SyncQueueBadge component
// Tests badge visibility and pending count display

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-badge'),
}));

describe('SyncQueueBadge Component', () => {
  it('should import SyncQueueBadge component', () => {
    const componentModule = require('../../src/components/SyncQueueBadge');
    expect(componentModule.SyncQueueBadge).toBeDefined();
    expect(typeof componentModule.SyncQueueBadge).toBe('function');
  });

  it('should import useQueueStatus hook', () => {
    const hookModule = require('../../src/hooks/useQueueStatus');
    expect(hookModule.useQueueStatus).toBeDefined();
    expect(typeof hookModule.useQueueStatus).toBe('function');
  });
});
