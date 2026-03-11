import { SyncStatusBadge } from '../../src/components/SyncStatusBadge';

describe('SyncStatusBadge Component', () => {
  it('should export SyncStatusBadge component', () => {
    expect(SyncStatusBadge).toBeDefined();
    expect(typeof SyncStatusBadge).toBe('function');
  });
});
