# @my-many-books/shared-validation

Shared validation library for My Many Books application. Provides consistent validation rules, constants, and validators across frontend and backend.

## Features

- **Single Source of Truth**: Validation rules defined once, used everywhere
- **Type-Safe**: Full TypeScript support with strict typing
- **Framework Agnostic**: Core validators work with any validation library
- **Context-Aware**: Different validation rules for different scenarios (user vs admin)
- **Well-Tested**: >90% code coverage

## Installation

```bash
npm install @my-many-books/shared-validation
```

## Usage

### Basic Validation

```typescript
import { validateIsbn, ISBN_CONSTRAINTS } from '@my-many-books/shared-validation';

const result = validateIsbn('978-0-439-42089-4');
if (result.isValid) {
  console.log('Valid ISBN:', result.normalizedIsbn);
} else {
  console.error('Invalid ISBN:', result.error);
}
```

### Constants

```typescript
import { ISBN_CONSTRAINTS, BOOK_CONSTRAINTS } from '@my-many-books/shared-validation';

// Use in your schemas
const isValidLength = isbn.length >= ISBN_CONSTRAINTS.MIN_LENGTH
  && isbn.length <= ISBN_CONSTRAINTS.MAX_LENGTH;
```

### Validators

```typescript
import {
  isValidIsbnFormat,
  normalizeIsbn,
  validateIsbn10Checksum,
  validateIsbn13Checksum
} from '@my-many-books/shared-validation';

const normalized = normalizeIsbn('978-0-439-42089-4');
// Returns: '9780439420894'
```

## Structure

```
src/
├── constants/       # Validation constraints (min/max, patterns)
├── validators/      # Pure validation functions
├── types/          # TypeScript type definitions
├── utils/          # Helper utilities (normalization, etc.)
├── errors/         # Error message constants
└── index.ts        # Public API exports
```

## Development

```bash
# Build the library
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## License

MIT
