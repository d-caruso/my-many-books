import {
  clearUserRepositoryAdapterCache,
  getUserRepositoryAdapter,
} from '../../../src/repositories/user/adapters/UserRepositoryAdapterFactory';
import { SequelizeUserAdapter } from '../../../src/repositories/user/adapters/SequelizeUserAdapter';

const originalProvider = process.env['USER_REPOSITORY_ADAPTER'];

describe('UserRepositoryAdapterFactory', () => {
  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env['USER_REPOSITORY_ADAPTER'];
    } else {
      process.env['USER_REPOSITORY_ADAPTER'] = originalProvider;
    }
    clearUserRepositoryAdapterCache();
  });

  it('returns Sequelize adapter by default', () => {
    delete process.env['USER_REPOSITORY_ADAPTER'];
    const adapter = getUserRepositoryAdapter();
    expect(adapter).toBeInstanceOf(SequelizeUserAdapter);
  });

  it('throws for unsupported provider', () => {
    process.env['USER_REPOSITORY_ADAPTER'] = 'prisma';
    expect(() => getUserRepositoryAdapter()).toThrow('Unsupported user repository adapter');
  });

  it('caches adapter per provider', () => {
    const first = getUserRepositoryAdapter();
    const second = getUserRepositoryAdapter();
    expect(first).toBe(second);
  });
});
