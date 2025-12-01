// ================================================================
// repositories/author/adapters/AuthorRepositoryAdapterFactory.ts
// Resolves the correct author adapter based on env config
// ================================================================

import { AuthorRepositoryAdapter } from './AuthorRepositoryAdapter';
import { SequelizeAuthorAdapter } from './SequelizeAuthorAdapter';

const ADAPTER_CACHE: Partial<Record<string, AuthorRepositoryAdapter>> = {};

export const getAuthorRepositoryAdapter = (): AuthorRepositoryAdapter => {
  const provider = (process.env['AUTHOR_REPOSITORY_ADAPTER'] || 'sequelize').toLowerCase();
  let adapter = ADAPTER_CACHE[provider];

  if (!adapter) {
    switch (provider) {
      case 'sequelize':
        adapter = new SequelizeAuthorAdapter();
        ADAPTER_CACHE[provider] = adapter;
        break;
      default:
        throw new Error(`Unsupported author repository adapter: ${provider}`);
    }
  }

  return adapter;
};

export const clearAuthorRepositoryAdapterCache = (): void => {
  Object.keys(ADAPTER_CACHE).forEach(key => {
    delete ADAPTER_CACHE[key];
  });
};
