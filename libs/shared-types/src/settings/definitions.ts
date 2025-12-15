// ================================================================
// libs/shared-types/src/settings/definitions.ts
// Settings Definitions - Source of Truth for Application Settings
// ================================================================

export type SettingType = 'string' | 'number' | 'boolean' | 'enum' | 'json';
export type SettingCategory = 'ui' | 'api' | 'features' | 'business' | 'security';

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
          defaultValue: 'remove',
          allowedValues: ['remove', 'keep', 'refresh'],
          description: 'Behavior when book status changes in filtered list'
        } as SettingDefinition<'remove' | 'keep' | 'refresh'>
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
