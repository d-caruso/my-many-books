// ================================================================
// repositories/book/adapters/BookRepositoryAdapterFactory.ts
// Resolves the correct adapter implementation based on env config
// ================================================================

import { BookRepositoryAdapter } from './BookRepositoryAdapter';
import { SequelizeBookAdapter } from './SequelizeBookAdapter';

const ADAPTER_CACHE: Partial<Record<string, BookRepositoryAdapter>> = {};

export const getBookRepositoryAdapter = (): BookRepositoryAdapter => {
  const provider = (process.env['BOOK_REPOSITORY_ADAPTER'] || 'sequelize').toLowerCase();
  let adapter = ADAPTER_CACHE[provider];

  if (!adapter) {
    switch (provider) {
      case 'sequelize':
        adapter = new SequelizeBookAdapter();
        ADAPTER_CACHE[provider] = adapter;
        break;
      default:
        throw new Error(`Unsupported book repository adapter: ${provider}`);
    }
  }

  return adapter;
};

export const clearBookRepositoryAdapterCache = (): void => {
  Object.keys(ADAPTER_CACHE).forEach(key => {
    delete ADAPTER_CACHE[key];
  });
};
