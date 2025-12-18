# Settings Service

Auto-syncing configuration management service for My Many Books.

## Overview

The SettingsService manages application configuration that can be modified at runtime through the admin interface. It automatically synchronizes settings from code constants to the database, providing a centralized, type-safe way to manage application behavior.

## Usage

### Initialization

The SettingsService must be initialized on server startup to load and sync settings:

```typescript
// apps/api/src/app.ts
import { SettingsService } from './services/SettingsService';

// After database sync
await SettingsService.initialize();
```

### Getting Settings

```typescript
import { SettingsService } from './services/SettingsService';
import { SETTING_KEYS } from '@my-many-books/shared-types';

// Get a single setting value
const behavior = SettingsService.getSetting(
  SETTING_KEYS.BOOKS.LIST.STATUS.ONCHANGE
);
// Returns: 'remove' | 'keep' | 'refresh'

// Get all active settings
const allSettings = SettingsService.getAllSettings();
// Returns: AppSetting[]
```

### Updating Settings (Admin Only)

```typescript
import { SettingsService } from './services/SettingsService';
import { SETTING_KEYS } from '@my-many-books/shared-types';

// Update setting value
await SettingsService.updateSetting(
  SETTING_KEYS.BOOKS.LIST.STATUS.ONCHANGE,
  'keep'
);

// Toggle setting active status
await SettingsService.toggleActive(
  SETTING_KEYS.BOOKS.LIST.STATUS.ONCHANGE,
  false
);
```

## Auto-Sync Behavior

On `initialize()`, the SettingsService automatically:

### 1. Creates New Settings
When a setting is added to `SETTING_DEFINITIONS`:
- Creates database row with default value
- Sets `active = true`, `deleted = false`
- No manual migration required

### 2. Restores Deleted Settings
When a previously deleted setting is re-added to code:
- Sets `deleted = false`
- Updates `lastSyncedAt`
- **Preserves admin customizations** (previous value restored)

### 3. Marks Orphaned Settings
When a setting is removed from code:
- Sets `deleted = true`, `deletedAt = NOW()`
- Keeps the key (no rename to `_deleted_`)
- **Preserves data** in case setting is re-added

### 4. Caches Active Settings
- Loads all active, non-deleted settings into in-memory Map
- Access time: <0.001ms
- No database queries during normal operation

## Performance

**Memory Usage:**
- ~100 bytes per setting
- 100 settings = ~10KB total

**Access Time:**
- `getSetting()`: <0.001ms (Map lookup)
- No database queries after initialization

**Refresh Strategy:**
- Settings cached on server startup
- Updated in cache when admin edits
- No periodic refresh needed (settings rarely change)

## Example: Adding a New Setting

### Step 1: Define Setting

```typescript
// libs/shared-types/src/settings/definitions.ts

export const SETTING_DEFINITIONS = {
  BOOKS: {
    EXPORT: {
      MAX_COUNT: {
        key: 'books.export.max_count',
        category: 'business',
        type: 'number',
        defaultValue: 1000,
        description: 'Maximum books allowed per export'
      }
    }
  }
} as const;

export const SETTING_KEYS = {
  BOOKS: {
    EXPORT: {
      MAX_COUNT: SETTING_DEFINITIONS.BOOKS.EXPORT.MAX_COUNT.key
    }
  }
} as const;
```

### Step 2: Restart API

```bash
npm run serve:api
```

**That's it!** The setting is automatically:
- ✅ Created in the database
- ✅ Loaded into cache
- ✅ Available via `getSetting()`
- ✅ Editable in admin UI

### Step 3: Use in Code

```typescript
import { SettingsService } from './services/SettingsService';
import { SETTING_KEYS } from '@my-many-books/shared-types';

export const exportBooks = async (bookIds: string[]) => {
  const maxCount = SettingsService.getSetting(
    SETTING_KEYS.BOOKS.EXPORT.MAX_COUNT
  );

  if (bookIds.length > maxCount) {
    throw new Error(`Cannot export more than ${maxCount} books at once`);
  }

  // ... export logic
};
```

## Architecture

### Class Structure

```typescript
class SettingsService {
  private static cache: Map<string, any>;
  private static initialized: boolean;

  // Lifecycle
  static async initialize(): Promise<void>
  static reset(): void  // For testing

  // Read operations
  static getSetting(key: string): any
  static getAllSettings(): AppSetting[]

  // Write operations (admin only)
  static async updateSetting(key: string, value: any): Promise<void>
  static async toggleActive(key: string, active: boolean): Promise<AppSetting>
}
```

### Data Flow

```
Startup:
┌─────────────────────────────────────────┐
│ SettingsService.initialize()            │
├─────────────────────────────────────────┤
│ 1. Load SETTING_DEFINITIONS from code   │
│ 2. Query database for existing settings │
│ 3. Create new settings                  │
│ 4. Restore deleted settings             │
│ 5. Mark orphaned settings as deleted    │
│ 6. Load active settings into cache      │
└─────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  In-Memory Cache      │
        │  Map<key, value>      │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  getSetting(key)      │
        │  <0.001ms lookup      │
        └───────────────────────┘
```

## Testing

**Unit Tests:** `apps/api/tests/unit/services/SettingsService.test.ts` (21 tests)

```typescript
// Test auto-sync creates new settings
await SettingsService.initialize();
expect(AppSetting.create).toHaveBeenCalledWith({
  key: 'new.setting',
  value: '"default"',
  // ...
});

// Test auto-sync restores deleted settings
expect(deletedSetting.deleted).toBe(false);

// Test cache operations
const value = SettingsService.getSetting('test.setting');
expect(value).toBe('expected-value');
```

## Files

- **Service:** `apps/api/src/services/SettingsService.ts`
- **Model:** `apps/api/src/models/AppSetting.ts`
- **Controller:** `apps/api/src/controllers/SettingsController.ts`
- **Routes:** `apps/api/src/routes/settingsRoutes.ts`
- **Types:** `libs/shared-types/src/settings/`
- **Tests:** `apps/api/tests/unit/services/SettingsService.test.ts`

## See Also

- **Settings Types README:** `libs/shared-types/src/settings/README.md` - How to define new settings
- **Admin UI README:** `apps/web-app/src/pages/Admin/README.md` - Using the admin interface
- **Developer Guide:** `docs/guides/adding-new-settings.md` - Complete walkthrough
