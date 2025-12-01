import {
  clearCategoryRepositoryAdapterCache,
  getCategoryRepositoryAdapter,
} from '../../../src/repositories/category/adapters/CategoryRepositoryAdapterFactory';
import { SequelizeCategoryAdapter } from '../../../src/repositories/category/adapters/SequelizeCategoryAdapter';

const originalProvider = process.env['CATEGORY_REPOSITORY_ADAPTER'];

describe('CategoryRepositoryAdapterFactory', () => {
  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env['CATEGORY_REPOSITORY_ADAPTER'];
    } else {
      process.env['CATEGORY_REPOSITORY_ADAPTER'] = originalProvider;
    }
    clearCategoryRepositoryAdapterCache();
  });

  it('returns Sequelize adapter by default', () => {
    delete process.env['CATEGORY_REPOSITORY_ADAPTER'];
    const adapter = getCategoryRepositoryAdapter();
    expect(adapter).toBeInstanceOf(SequelizeCategoryAdapter);
  });

  it('throws for unsupported provider', () => {
    process.env['CATEGORY_REPOSITORY_ADAPTER'] = 'prisma';
    expect(() => getCategoryRepositoryAdapter()).toThrow('Unsupported category repository adapter');
  });

  it('caches per provider', () => {
    const first = getCategoryRepositoryAdapter();
    const second = getCategoryRepositoryAdapter();
    expect(first).toBe(second);
  });
});
