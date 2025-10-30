# @my-many-books/shared-i18n

Internationalization (i18n) library for My Many Books applications using i18next.

## Current Languages

- 🇬🇧 English (en) - Default
- 🇮🇹 Italian (it)

## Usage

### In React/React Native Components

```typescript
import { initializeI18n, SUPPORTED_LANGUAGES } from '@my-many-books/shared-i18n';

// Initialize at app startup
await initializeI18n('en');

// Then use react-i18next hooks
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return <div>{t('common:save')}</div>;
}
```

### In API/Backend

```typescript
import i18n from '@my-many-books/shared-i18n';

// In your controller
const language = request.headers['accept-language'] || 'en';
await i18n.changeLanguage(language);

const message = i18n.t('errors:book_not_found');
```

## Translation Namespaces

- `common` - Common UI elements (buttons, labels, etc.)
- `validation` - Form validation messages
- `errors` - API/system error messages
- `books` - Book-specific terminology

## Adding a New Language

### Step 1: Create Translation Files

1. Create a new folder in `src/locales/` with the language code (e.g., `de` for German)
2. Copy all JSON files from `src/locales/en/` to the new folder
3. Translate all values (keep keys identical)

```bash
mkdir src/locales/de
cp src/locales/en/*.json src/locales/de/
# Now translate the values in each file
```

### Step 2: Update Types

Edit `src/types.ts`:

```typescript
export enum SupportedLanguage {
  EN = 'en',
  IT = 'it',
  DE = 'de',  // Add new language
}

export const SUPPORTED_LANGUAGES: LanguageMetadata[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },  // Add metadata
];
```

### Step 3: Update Config

Edit `src/config.ts`:

```typescript
// Import German translations
import deCommon from './locales/de/common.json';
import deValidation from './locales/de/validation.json';
import deErrors from './locales/de/errors.json';
import deBooks from './locales/de/books.json';

// Add to resources
resources: {
  en: { ... },
  it: { ... },
  de: {  // Add German resources
    [TranslationNamespace.COMMON]: deCommon,
    [TranslationNamespace.VALIDATION]: deValidation,
    [TranslationNamespace.ERRORS]: deErrors,
    [TranslationNamespace.BOOKS]: deBooks,
  },
}
```

### Step 4: Test

```typescript
import { changeLanguage } from '@my-many-books/shared-i18n';

await changeLanguage('de');
```

The language will now appear in language selectors automatically!

## Translation Key Format

Use dot notation for nested keys and interpolation for dynamic values:

```typescript
// Simple key
t('common:save')  // → "Save" or "Salva"

// With interpolation
t('errors:isbn_exists', { isbn: '1234567890' })
// → "Book with ISBN 1234567890 already exists"

// With pluralization
t('books:found_count', { count: 5 })
// → "5 books found" or "5 libri trovati"
```

## Best Practices

1. **Always use namespaces**: `t('namespace:key')` not `t('key')`
2. **Keep keys lowercase with underscores**: `book_not_found` not `bookNotFound`
3. **Use interpolation for dynamic values**: `{{variable}}`
4. **Test with both languages** before committing
5. **Keep translations concise** and user-friendly

## Architecture

This library uses:
- **i18next** for core i18n functionality
- **JSON** files for translations (easy to edit, no compilation needed)
- **TypeScript** for type safety
- **Namespace separation** for better organization
