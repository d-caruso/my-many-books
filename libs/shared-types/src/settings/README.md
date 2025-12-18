# Settings Type Definitions

Type-safe settings constants and TypeScript types for the My Many Books settings system.

## Overview

This package contains the source of truth for all application settings. Settings are defined as TypeScript constants that are automatically synced to the database on API startup.

## Structure

```
libs/shared-types/src/settings/
├── definitions.ts     # Setting definitions (source of truth)
├── types.ts          # TypeScript interfaces
├── enums.ts          # Setting-specific enums
└── index.ts          # Public exports
```

## Adding a New Setting

### Step 1: Define the Setting

Add your setting to `definitions.ts`:

```typescript
// libs/shared-types/src/settings/definitions.ts

export const SETTING_DEFINITIONS = {
  BOOKS: {
    EXPORT: {
      MAX_COUNT: {
        key: 'books.export.max_count',        // Unique identifier
        category: 'business',                  // ui, api, features, business, security
        type: 'number',                        // string, number, boolean, enum, json
        defaultValue: 1000,                    // Default value (actual type, not JSON)
        description: 'Maximum books per export' // Human-readable description
      }
    }
  }
} as const;
```

### Step 2: Add to SETTING_KEYS Helper

```typescript
// libs/shared-types/src/settings/definitions.ts

export const SETTING_KEYS = {
  BOOKS: {
    EXPORT: {
      MAX_COUNT: SETTING_DEFINITIONS.BOOKS.EXPORT.MAX_COUNT.key
    }
  }
} as const;
```

### Step 3: Add Enum Values (if type is 'enum')

If your setting is an enum, define the allowed values:

```typescript
// libs/shared-types/src/settings/enums.ts

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  PDF = 'pdf'
}
```

Then reference in the setting definition:

```typescript
EXPORT_FORMAT: {
  key: 'books.export.format',
  category: 'ui',
  type: 'enum',
  defaultValue: ExportFormat.CSV,
  allowedValues: Object.values(ExportFormat),
  description: 'Export file format'
}
```

### Step 4: Build and Restart

```bash
# Build shared-types
cd libs/shared-types && npm run build

# Restart API (auto-sync will create the setting)
cd ../../apps/api && npm run serve:api
```

**Done!** No migration needed. The setting is now:
- ✅ In the database
- ✅ Cached in memory
- ✅ Available via API
- ✅ Editable in admin UI
- ✅ Accessible with type-safety

## Setting Definition Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Unique identifier (e.g., `'books.export.max_count'`) |
| `category` | `SettingCategory` | Grouping: `ui`, `api`, `features`, `business`, `security` |
| `type` | `SettingType` | Data type: `string`, `number`, `boolean`, `enum`, `json` |
| `defaultValue` | `any` | Default value (actual type, not JSON string) |
| `description` | `string` | Human-readable description for admin UI |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `allowedValues` | `any[]` | For `enum` type: array of valid values |

## Setting Types

### string
```typescript
TEXT_SETTING: {
  key: 'app.welcome.message',
  category: 'ui',
  type: 'string',
  defaultValue: 'Welcome to My Many Books!',
  description: 'Welcome message shown on homepage'
}
```

### number
```typescript
NUMBER_SETTING: {
  key: 'books.pagination.page_size',
  category: 'ui',
  type: 'number',
  defaultValue: 20,
  description: 'Number of books per page'
}
```

### boolean
```typescript
BOOLEAN_SETTING: {
  key: 'features.dark_mode.enabled',
  category: 'features',
  type: 'boolean',
  defaultValue: false,
  description: 'Enable dark mode toggle'
}
```

### enum
```typescript
ENUM_SETTING: {
  key: 'books.list.status.onchange',
  category: 'ui',
  type: 'enum',
  defaultValue: 'remove',
  allowedValues: ['remove', 'keep', 'refresh'],
  description: 'Behavior when book status changes'
}
```

### json
```typescript
JSON_SETTING: {
  key: 'api.rate_limit.config',
  category: 'api',
  type: 'json',
  defaultValue: { windowMs: 900000, max: 100 },
  description: 'Rate limiting configuration'
}
```

## Setting Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| `ui` | User interface behavior | list behaviors, pagination, themes |
| `api` | API configuration | rate limits, timeouts, cache TTLs |
| `features` | Feature flags | experimental features, A/B tests |
| `business` | Business rules | export limits, validation rules |
| `security` | Security settings | password policies, session timeouts |

## Using Settings in Code

### Backend (API)

```typescript
import { SettingsService } from './services/SettingsService';
import { SETTING_KEYS } from '@my-many-books/shared-types';

const maxCount = SettingsService.getSetting(
  SETTING_KEYS.BOOKS.EXPORT.MAX_COUNT
);
```

### Frontend (Web/Mobile)

```typescript
import { useSetting } from '../hooks/useSetting';
import { SETTING_KEYS } from '@my-many-books/shared-types';

export const ExportPage = () => {
  const { value: maxCount, isLoading } = useSetting(
    SETTING_KEYS.BOOKS.EXPORT.MAX_COUNT
  );

  if (isLoading) return <Loading />;

  return <div>Max export: {maxCount} books</div>;
};
```

## Type Safety

The `SETTING_KEYS` helper provides full TypeScript autocomplete:

```typescript
// ✅ Autocomplete works
SETTING_KEYS.BOOKS.EXPORT.MAX_COUNT

// ✅ Type error if key doesn't exist
SETTING_KEYS.BOOKS.INVALID.KEY  // TypeScript error

// ✅ Compile-time validation
const key: string = SETTING_KEYS.BOOKS.EXPORT.MAX_COUNT;
```

## Naming Conventions

### Key Format
```
<domain>.<subdomain>.<feature>.<property>
```

**Examples:**
- `books.list.status.onchange`
- `users.auth.session.timeout`
- `api.rate_limit.window_ms`

**Rules:**
- Use lowercase
- Separate with dots (`.`)
- Use underscores (`_`) within words
- Be descriptive but concise

### Constant Naming
```typescript
// ✅ Good: Matches key structure
BOOKS.LIST.STATUS.ONCHANGE

// ❌ Bad: Different structure
BOOKS.STATUS_ONCHANGE
```

## Best Practices

### 1. Use Meaningful Defaults
```typescript
// ✅ Good: Sensible default
defaultValue: 20  // Reasonable page size

// ❌ Bad: Arbitrary or confusing
defaultValue: 0   // What does 0 mean?
```

### 2. Write Clear Descriptions
```typescript
// ✅ Good: Explains purpose and impact
description: 'Number of books shown per page. Higher values may slow page load.'

// ❌ Bad: Vague or redundant
description: 'Page size'
```

### 3. Group Related Settings
```typescript
// ✅ Good: Logical grouping
BOOKS: {
  LIST: {
    PAGE_SIZE: {...},
    STATUS_ONCHANGE: {...}
  }
}

// ❌ Bad: Flat structure
BOOKS_LIST_PAGE_SIZE: {...}
BOOKS_LIST_STATUS: {...}
```

### 4. Choose Appropriate Types
```typescript
// ✅ Good: enum for fixed choices
type: 'enum',
allowedValues: ['remove', 'keep', 'refresh']

// ❌ Bad: string for fixed choices
type: 'string',
defaultValue: 'remove'  // No validation
```

## Common Patterns

### Feature Flags
```typescript
FEATURES: {
  NEW_UI: {
    ENABLED: {
      key: 'features.new_ui.enabled',
      category: 'features',
      type: 'boolean',
      defaultValue: false,
      description: 'Enable new UI redesign (beta)'
    }
  }
}
```

### Rate Limiting
```typescript
API: {
  RATE_LIMIT: {
    WINDOW_MS: {
      key: 'api.rate_limit.window_ms',
      category: 'api',
      type: 'number',
      defaultValue: 900000,  // 15 minutes
      description: 'Rate limit window in milliseconds'
    },
    MAX_REQUESTS: {
      key: 'api.rate_limit.max_requests',
      category: 'api',
      type: 'number',
      defaultValue: 100,
      description: 'Maximum requests per window'
    }
  }
}
```

### UI Behaviors
```typescript
UI: {
  LIST: {
    BEHAVIOR_ON_DELETE: {
      key: 'ui.list.behavior_on_delete',
      category: 'ui',
      type: 'enum',
      defaultValue: 'remove',
      allowedValues: ['remove', 'fade', 'keep_dimmed'],
      description: 'How to handle list items after deletion'
    }
  }
}
```

## Testing

When testing code that uses settings:

```typescript
// Mock the setting
jest.mock('@my-many-books/shared-types', () => ({
  SETTING_KEYS: {
    BOOKS: {
      EXPORT: {
        MAX_COUNT: 'books.export.max_count'
      }
    }
  }
}));

// Mock SettingsService
jest.mock('./services/SettingsService', () => ({
  getSetting: jest.fn().mockReturnValue(500)
}));
```

## Files

- **Definitions:** `libs/shared-types/src/settings/definitions.ts`
- **Types:** `libs/shared-types/src/settings/types.ts`
- **Enums:** `libs/shared-types/src/settings/enums.ts`
- **Exports:** `libs/shared-types/src/settings/index.ts`

## See Also

- **SettingsService README:** `apps/api/src/services/README.md` - Backend usage
- **Admin UI README:** `apps/web-app/src/pages/Admin/README.md` - Admin interface
- **Developer Guide:** `docs/guides/adding-new-settings.md` - Complete walkthrough
