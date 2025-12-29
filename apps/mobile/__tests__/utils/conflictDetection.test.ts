// Test for conflict detection utilities
// Tests conflict detection and resolution logic

describe('Conflict Detection', () => {
  it('should import conflict detection utilities', () => {
    const utilsModule = require('../../src/utils/conflictDetection');
    expect(utilsModule.hasConflict).toBeDefined();
    expect(typeof utilsModule.hasConflict).toBe('function');
    expect(utilsModule.resolveConflict).toBeDefined();
    expect(typeof utilsModule.resolveConflict).toBe('function');
  });

  it('should detect no conflict when timestamps match', () => {
    const { hasConflict } = require('../../src/utils/conflictDetection');

    const timestamp = new Date().toISOString();
    const localBook = {
      id: 1,
      title: 'Test Book',
      _serverUpdatedAt: timestamp,
      updateDate: timestamp,
    };
    const serverBook = {
      id: 1,
      title: 'Test Book',
      updateDate: timestamp,
    };

    expect(hasConflict(localBook, serverBook)).toBe(false);
  });

  it('should detect conflict when server is newer', () => {
    const { hasConflict } = require('../../src/utils/conflictDetection');

    const oldTimestamp = new Date('2024-01-01').toISOString();
    const newTimestamp = new Date('2024-01-02').toISOString();

    const localBook = {
      id: 1,
      title: 'Test Book Local',
      _serverUpdatedAt: oldTimestamp,
      updateDate: oldTimestamp,
    };
    const serverBook = {
      id: 1,
      title: 'Test Book Server',
      updateDate: newTimestamp,
    };

    expect(hasConflict(localBook, serverBook)).toBe(true);
  });

  it('should resolve conflict choosing server version', () => {
    const { resolveConflict } = require('../../src/utils/conflictDetection');

    const localBook = {
      id: 1,
      title: 'Test Book Local',
      updateDate: '2024-01-01',
    };
    const serverBook = {
      id: 1,
      title: 'Test Book Server',
      updateDate: '2024-01-02',
    };

    const resolved = resolveConflict(localBook, serverBook, 'server');

    expect(resolved.title).toBe('Test Book Server');
    expect(resolved._syncStatus).toBe('synced');
  });

  it('should resolve conflict choosing local version', () => {
    const { resolveConflict } = require('../../src/utils/conflictDetection');

    const localBook = {
      id: 1,
      title: 'Test Book Local',
      updateDate: '2024-01-01',
    };
    const serverBook = {
      id: 1,
      title: 'Test Book Server',
      updateDate: '2024-01-02',
    };

    const resolved = resolveConflict(localBook, serverBook, 'local');

    expect(resolved.title).toBe('Test Book Local');
    expect(resolved._syncStatus).toBe('pending');
  });
});
