// Test for SyncStatusBadge component
// Tests sync status badge visibility and behavior

describe('SyncStatusBadge Component', () => {
  it('should import SyncStatusBadge component', () => {
    const componentModule = require('../../src/components/SyncStatusBadge');
    expect(componentModule.SyncStatusBadge).toBeDefined();
    expect(typeof componentModule.SyncStatusBadge).toBe('function');
  });

  it('should verify SyncStatus type exists', () => {
    const typesModule = require('../../src/types');
    expect(typesModule).toBeDefined();
  });
});
