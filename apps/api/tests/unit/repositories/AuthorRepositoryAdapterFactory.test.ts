import {
  clearAuthorRepositoryAdapterCache,
  getAuthorRepositoryAdapter,
} from '../../../src/repositories/author/adapters/AuthorRepositoryAdapterFactory';
import { SequelizeAuthorAdapter } from '../../../src/repositories/author/adapters/SequelizeAuthorAdapter';

describe('AuthorRepositoryAdapterFactory', () => {
  const originalProvider = process.env['AUTHOR_REPOSITORY_ADAPTER'];

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env['AUTHOR_REPOSITORY_ADAPTER'];
    } else {
      process.env['AUTHOR_REPOSITORY_ADAPTER'] = originalProvider;
    }
    clearAuthorRepositoryAdapterCache();
  });

  it('returns Sequelize adapter by default', () => {
    delete process.env['AUTHOR_REPOSITORY_ADAPTER'];
    const adapter = getAuthorRepositoryAdapter();
    expect(adapter).toBeInstanceOf(SequelizeAuthorAdapter);
  });

  it('throws for unsupported provider', () => {
    process.env['AUTHOR_REPOSITORY_ADAPTER'] = 'prisma';
    expect(() => getAuthorRepositoryAdapter()).toThrow('Unsupported author repository adapter');
  });

  it('caches adapter per provider', () => {
    const first = getAuthorRepositoryAdapter();
    const second = getAuthorRepositoryAdapter();
    expect(first).toBe(second);
  });
});
