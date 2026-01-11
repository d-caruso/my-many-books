// ================================================================
// libs/shared-types/src/settings/definitions.ts
// Settings Definitions - Source of Truth for Application Settings
// ================================================================

export type SettingType = 'string' | 'number' | 'boolean' | 'enum' | 'json';
export type SettingCategory = 'ui' | 'api' | 'features' | 'business' | 'security' | 'mobile_hooks' | 'emergency' | 'mobile_hook_actions' | 'user_mobile_config';

// Arrays for Zod enum validation
export const SettingTypeValues = ['string', 'number', 'boolean', 'enum', 'json'] as const;
export const SettingCategoryValues = ['ui', 'api', 'features', 'business', 'security', 'mobile_hooks', 'emergency', 'mobile_hook_actions', 'user_mobile_config'] as const;

// Book list status change behavior constants
export const BOOK_STATUS_CHANGE_BEHAVIOR = {
  REMOVE: 'remove',
  KEEP: 'keep',
  REFRESH: 'refresh',
} as const;

export type BookStatusChangeBehavior = typeof BOOK_STATUS_CHANGE_BEHAVIOR[keyof typeof BOOK_STATUS_CHANGE_BEHAVIOR];

export interface SettingDefinition<T = unknown> {
  key: string;
  category: SettingCategory;
  type: SettingType;
  defaultValue: T;
  allowedValues?: readonly T[];
  description: string;
}

/**
 * SETTING_DEFINITIONS is the single source of truth for all application settings.
 *
 * Structure:
 * - Organized hierarchically by feature/domain
 * - Each setting has a unique key (dot-notation)
 * - Type-safe default values
 * - Allowed values for enum types
 * - Human-readable descriptions
 *
 * Sync Behavior:
 * - On API startup, these definitions sync to database
 * - New settings are inserted
 * - Removed settings are marked as deleted
 * - Changed descriptions/defaults are updated
 */
export const SETTING_DEFINITIONS = {
  BOOKS: {
    LIST: {
      STATUS: {
        ONCHANGE: {
          key: 'books.list.status.onchange',
          category: 'ui',
          type: 'enum',
          defaultValue: BOOK_STATUS_CHANGE_BEHAVIOR.REMOVE,
          allowedValues: [
            BOOK_STATUS_CHANGE_BEHAVIOR.REMOVE,
            BOOK_STATUS_CHANGE_BEHAVIOR.KEEP,
            BOOK_STATUS_CHANGE_BEHAVIOR.REFRESH
          ] as const,
          description: 'Behavior when book status changes in filtered list'
        } as SettingDefinition<BookStatusChangeBehavior>
      }
    }
  },
  USERS: {
    LIST: {
      ACTIVE: {
        ONCHANGE: {
          key: 'users.list.active.onchange',
          category: 'ui',
          type: 'enum',
          defaultValue: 'refresh',
          allowedValues: ['remove', 'refresh'],
          description: 'Behavior when user active status changes'
        } as SettingDefinition<'remove' | 'refresh'>
      }
    }
  },
  SEARCH: {
    FULLTEXT: {
      ENABLED: {
        key: 'search.fulltext.enabled',
        category: 'features',
        type: 'boolean',
        defaultValue: true,
        description: 'Enable MySQL FULLTEXT search (can be overridden by SEARCH_FULLTEXT_FORCE_DISABLED or SEARCH_FULLTEXT_FORCE_ENABLED env vars)'
      } as SettingDefinition<boolean>,
      SORTABLE_FIELDS: {
        key: 'search.fulltext.sortable_fields',
        category: 'features',
        type: 'json',
        defaultValue: ['title', 'createdAt', 'updatedAt'],
        description: 'Fields that can be used for sorting search results'
      } as SettingDefinition<string[]>,
      DEFAULT_SORT: {
        key: 'search.fulltext.default_sort',
        category: 'features',
        type: 'string',
        defaultValue: 'title',
        description: 'Default sort field for search results'
      } as SettingDefinition<string>
    }
  }
} as const;

/**
 * SETTING_KEYS provides easy access to setting keys throughout the application.
 *
 * Usage:
 * ```typescript
 * import { SETTING_KEYS } from '@my-many-books/shared-types';
 *
 * const key = SETTING_KEYS.BOOKS.LIST.STATUS.ONCHANGE;
 * // => 'books.list.status.onchange'
 * ```
 */
export const SETTING_KEYS = {
  BOOKS: {
    LIST: {
      STATUS: {
        ONCHANGE: SETTING_DEFINITIONS.BOOKS.LIST.STATUS.ONCHANGE.key
      }
    }
  },
  USERS: {
    LIST: {
      ACTIVE: {
        ONCHANGE: SETTING_DEFINITIONS.USERS.LIST.ACTIVE.ONCHANGE.key
      }
    }
  },
  SEARCH: {
    FULLTEXT: {
      ENABLED: SETTING_DEFINITIONS.SEARCH.FULLTEXT.ENABLED.key,
      SORTABLE_FIELDS: SETTING_DEFINITIONS.SEARCH.FULLTEXT.SORTABLE_FIELDS.key,
      DEFAULT_SORT: SETTING_DEFINITIONS.SEARCH.FULLTEXT.DEFAULT_SORT.key
    }
  }
} as const;

/**
 * Helper to get all setting definitions as a flat array
 */
export function getAllSettingDefinitions(): SettingDefinition[] {
  const definitions: SettingDefinition[] = [];

  function traverse(obj: any): void {
    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        if ('key' in value && 'category' in value && 'type' in value) {
          definitions.push(value as SettingDefinition);
        } else {
          traverse(value);
        }
      }
    }
  }

  traverse(SETTING_DEFINITIONS);
  return definitions;
}
