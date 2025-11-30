// ================================================================
// repositories/author/adapters/AuthorRepositoryAdapterFactory.ts
// Resolves the correct author adapter based on env config
// ================================================================

import { AuthorRepositoryAdapter } from './AuthorRepositoryAdapter';
import { SequelizeAuthorAdapter } from './SequelizeAuthorAdapter';

const ADAPTER_CACHE: Partial<Record<string, AuthorRepositoryAdapter>> = {};

export const getAuthorRepositoryAdapter = (): AuthorRepositoryAdapter => {
  const provider = (process.env['AUTHOR_REPOSITORY_ADAPTER'] || 'sequelize').toLowerCase();

  if (!ADAPTER_CACHE[provider]) {
    switch (provider) {
      case 'sequelize':
        ADAPTER_CACHE[provider] = new SequelizeAuthorAdapter();
        break;
      default:
        throw new Error(`Unsupported author repository adapter: ${provider}`);
    }
  }

  return ADAPTER_CACHE[provider]!;
};

export const clearAuthorRepositoryAdapterCache = (): void => {
  Object.keys(ADAPTER_CACHE).forEach(key => {
    delete ADAPTER_CACHE[key];
  });
};
