// ================================================================
// repositories/user/adapters/UserRepositoryAdapterFactory.ts
// Resolves adapter implementations based on env config
// ================================================================

import { UserRepositoryAdapter } from './UserRepositoryAdapter';
import { SequelizeUserAdapter } from './SequelizeUserAdapter';

const ADAPTER_CACHE: Partial<Record<string, UserRepositoryAdapter>> = {};

export const getUserRepositoryAdapter = (): UserRepositoryAdapter => {
  const provider = (process.env['USER_REPOSITORY_ADAPTER'] || 'sequelize').toLowerCase();
  let adapter = ADAPTER_CACHE[provider];

  if (!adapter) {
    switch (provider) {
      case 'sequelize':
        adapter = new SequelizeUserAdapter();
        ADAPTER_CACHE[provider] = adapter;
        break;
      default:
        throw new Error(`Unsupported user repository adapter: ${provider}`);
    }
  }

  return adapter;
};

export const clearUserRepositoryAdapterCache = (): void => {
  Object.keys(ADAPTER_CACHE).forEach(key => delete ADAPTER_CACHE[key]);
};
