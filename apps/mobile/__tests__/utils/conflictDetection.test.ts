import { hasConflict, resolveConflict } from '../../src/utils/conflictDetection';

describe('Conflict Detection', () => {
  it('should export conflict detection utilities', () => {
    expect(hasConflict).toBeDefined();
    expect(typeof hasConflict).toBe('function');
    expect(resolveConflict).toBeDefined();
    expect(typeof resolveConflict).toBe('function');
  });

  it('should detect no conflict when timestamps match', () => {
    const timestamp = new Date().toISOString();
    const localBook = {
      id: 1,
      title: 'Test Book',
      serverUpdatedAt: timestamp,
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
    const oldTimestamp = new Date('2024-01-01').toISOString();
    const newTimestamp = new Date('2024-01-02').toISOString();

    const localBook = {
      id: 1,
      title: 'Test Book Local',
      serverUpdatedAt: oldTimestamp,
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

    expect(resolved.entity.title).toBe('Test Book Server');
    expect(resolved.syncStatus).toBe('synced');
  });

  it('should resolve conflict choosing local version', () => {
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
    expect(resolved.syncStatus).toBe('pending');
  });
});
