import {
  clearBookRepositoryAdapterCache,
  getBookRepositoryAdapter,
} from '../../../src/repositories/book/adapters/BookRepositoryAdapterFactory';
import { SequelizeBookAdapter } from '../../../src/repositories/book/adapters/SequelizeBookAdapter';

describe('BookRepositoryAdapterFactory', () => {
  const originalProvider = process.env['BOOK_REPOSITORY_ADAPTER'];

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env['BOOK_REPOSITORY_ADAPTER'];
    } else {
      process.env['BOOK_REPOSITORY_ADAPTER'] = originalProvider;
    }
    clearBookRepositoryAdapterCache();
  });

  it('returns Sequelize adapter by default', () => {
    delete process.env['BOOK_REPOSITORY_ADAPTER'];
    const adapter = getBookRepositoryAdapter();
    expect(adapter).toBeInstanceOf(SequelizeBookAdapter);
  });

  it('throws for unsupported provider', () => {
    process.env['BOOK_REPOSITORY_ADAPTER'] = 'prisma';

    expect(() => getBookRepositoryAdapter()).toThrow('Unsupported book repository adapter');
  });

  it('caches adapter instances per provider', () => {
    const first = getBookRepositoryAdapter();
    const second = getBookRepositoryAdapter();
    expect(first).toBe(second);
  });
});
