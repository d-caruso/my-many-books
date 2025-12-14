# @my-many-books/shared-validation

**Pure TypeScript validation library for My Many Books application**

A framework-agnostic validation library that provides a single source of truth for validation rules, constants, and error messages across frontend and backend.

## Features

- ✅ **Framework Agnostic**: Pure TypeScript functions work with Joi, Zod, or any framework
- ✅ **Type Safe**: Full TypeScript support with strict typing
- ✅ **i18n Ready**: All validators return translatable error keys
- ✅ **Zero Dependencies**: No runtime dependencies, tree-shakable
- ✅ **Comprehensive**: Validators for ISBN, Book, Author, Category
- ✅ **Well Tested**: 110 tests with 94.55% coverage
- ✅ **Single Source of Truth**: One place for all validation rules

## Installation

This library is used internally within the My Many Books monorepo:

```bash
# Already available in the monorepo
import { validateIsbn, BOOK_CONSTRAINTS } from '@my-many-books/shared-validation';
```

## Quick Start

### Basic ISBN Validation

```typescript
import { validateIsbn, normalizeIsbn } from '@my-many-books/shared-validation';

// Validate ISBN
const result = validateIsbn('978-0-451-52493-5');
if (result.isValid) {
  console.log('Valid ISBN:', result.normalizedIsbn); // '9780451524935'
  console.log('Format:', result.format); // 'ISBN-13'
} else {
  console.log('Error:', result.error);
  console.log('i18n key:', result.i18nKey); // 'validation:isbn_invalid'
}
```

### Book Field Validation

```typescript
import { validateTitle, validateStatus, BOOK_CONSTRAINTS } from '@my-many-books/shared-validation';

// Validate book title
const titleResult = validateTitle('1984');
if (!titleResult.isValid) {
  console.log(titleResult.error);     // Human-readable error
  console.log(titleResult.errorCode); // 'TITLE_TOO_SHORT'
  console.log(titleResult.i18nKey);   // 'validation:book_title_too_short'
}
```

## API Documentation

### ISBN Validators

#### `validateIsbn(isbn: string): IsbnValidationResult`

Validates ISBN-10 or ISBN-13 with checksum verification.

**Returns:**
```typescript
{
  isValid: boolean;
  normalizedIsbn?: string;     // ISBN without hyphens/spaces
  format?: 'ISBN-10' | 'ISBN-13';
  error?: string;              // Human-readable error
  errorCode?: string;          // Programmatic error code
  i18nKey?: string;           // Translation key
}
```

**Examples:**
```typescript
validateIsbn('9780451524935');        // ✅ Valid ISBN-13
validateIsbn('043942089X');           // ✅ Valid ISBN-10 (with X)
validateIsbn('978-0-451-52493-5');   // ✅ Valid (with hyphens)
validateIsbn('1234567890');           // ❌ Invalid checksum
```

#### `normalizeIsbn(isbn: string): string`

Removes hyphens, spaces, and converts to uppercase.

```typescript
normalizeIsbn('978-0-451-52493-5'); // '9780451524935'
normalizeIsbn('0-439-42089-x');     // '043942089X'
```

#### `isValidIsbnFormat(isbn: string): boolean`

Quick format check without checksum validation.

### Book Validators

#### `validateTitle(title: string): ValidationResult`
Validates book title (1-500 characters).

#### `validateNotes(notes: string | null): ValidationResult`
Validates optional notes field (max 2000 characters).

#### `validateStatus(status: string): ValidationResult`
Validates book reading status ('reading', 'paused', 'finished', 'TO_READ').

#### `validateEditionNumber(editionNumber: number | null): ValidationResult`
Validates optional edition number (positive integer).

#### `validateEditionDate(editionDate: string | Date | null): ValidationResult`
Validates optional edition date.

#### `isValidBookStatus(status: string): boolean`
Quick status check.

### Author Validators

#### `validateAuthorName(name: string): ValidationResult`
Validates author first name (1-255 chars, letters/spaces/hyphens/apostrophes/accented).

#### `validateAuthorSurname(surname: string): ValidationResult`
Validates author surname (same rules as name).

#### `validateNationality(nationality: string | null): ValidationResult`
Validates optional nationality (max 255 characters).

#### `isValidName(name: string): boolean`
Quick name format check.

### Category Validators

#### `validateCategoryName(name: string): ValidationResult`
Validates category name (1-255 characters).

#### `isValidCategoryName(name: string): boolean`
Quick category name check.

## Constants

### ISBN Constants
```typescript
ISBN_CONSTRAINTS.MIN_LENGTH        // 10
ISBN_CONSTRAINTS.MAX_LENGTH        // 13
ISBN_CONSTRAINTS.VALID_PREFIXES    // ['978', '979']

ISBN_PATTERNS.NORMALIZED           // /^[\dX]{10,13}$/i
ISBN_PATTERNS.ISBN_10              // /^\d{9}[\dX]$/i
ISBN_PATTERNS.ISBN_13              // /^\d{13}$/
```

### Book Constants
```typescript
BOOK_CONSTRAINTS.TITLE.MAX_LENGTH        // 500
BOOK_CONSTRAINTS.NOTES.MAX_LENGTH        // 2000
VALID_BOOK_STATUSES                      // ['reading', 'paused', 'finished', 'TO_READ']
```

### Author Constants
```typescript
AUTHOR_CONSTRAINTS.NAME.MAX_LENGTH        // 255
AUTHOR_CONSTRAINTS.SURNAME.MAX_LENGTH     // 255
AUTHOR_PATTERNS.NAME                      // /^[a-zA-ZÀ-ÿ\s'-]+$/
```

### Category Constants
```typescript
CATEGORY_CONSTRAINTS.NAME.MAX_LENGTH     // 255
```

## Usage with Frameworks

### With Zod (Frontend)

```typescript
import { z } from 'zod';
import { isValidIsbnFormat, ISBN_CONSTRAINTS, BOOK_CONSTRAINTS } from '@my-many-books/shared-validation';

const bookSchema = z.object({
  title: z.string()
    .min(BOOK_CONSTRAINTS.TITLE.MIN_LENGTH)
    .max(BOOK_CONSTRAINTS.TITLE.MAX_LENGTH),
  isbnCode: z.string().refine(isValidIsbnFormat),
});
```

### With Joi (Backend)

```typescript
import Joi from 'joi';
import { validateIsbn, ISBN_CONSTRAINTS } from '@my-many-books/shared-validation';

const bookSchema = Joi.object({
  isbnCode: Joi.string()
    .min(ISBN_CONSTRAINTS.MIN_LENGTH)
    .custom((value) => {
      const result = validateIsbn(value);
      if (!result.isValid) throw new Error(result.error);
      return result.normalizedIsbn;
    }),
});
```

## Testing

```bash
npm test              # Run tests
npm run test:coverage # Run with coverage
```

**Current Coverage:**
- Overall: **94.55%** (110 tests)
- Validators: **93.71%** coverage
- Utils: **100%** coverage
- Functions: **100%** coverage

## Building

```bash
npm run build
```

## License

Internal library for My Many Books application.

---

**Version**: 0.1.0  
**Last Updated**: 2025-12-14
