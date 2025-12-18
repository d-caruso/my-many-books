// ================================================================
// repositories/category/adapters/CategoryRepositoryAdapterFactory.ts
// Resolves adapter implementations based on env config
// ================================================================

import { CategoryRepositoryAdapter } from './CategoryRepositoryAdapter';
import { SequelizeCategoryAdapter } from './SequelizeCategoryAdapter';

const ADAPTER_CACHE: Partial<Record<string, CategoryRepositoryAdapter>> = {};

export const getCategoryRepositoryAdapter = (): CategoryRepositoryAdapter => {
  const provider = (process.env['CATEGORY_REPOSITORY_ADAPTER'] || 'sequelize').toLowerCase();
  let adapter = ADAPTER_CACHE[provider];

  if (!adapter) {
    switch (provider) {
      case 'sequelize':
        adapter = new SequelizeCategoryAdapter();
        ADAPTER_CACHE[provider] = adapter;
        break;
      default:
        throw new Error(`Unsupported category repository adapter: ${provider}`);
    }
  }

  return adapter;
};

export const clearCategoryRepositoryAdapterCache = (): void => {
  Object.keys(ADAPTER_CACHE).forEach(key => delete ADAPTER_CACHE[key]);
};
