# @my-many-books/shared-design

Shared, platform-agnostic design primitives for the monorepo.

## What it provides

- **Book status colors**: `BOOK_STATUS_COLORS`, `getStatusColor`
- **Themes**: `themes` (aspirational — not yet consumed by any app)

## Book status colors

`BOOK_STATUS_COLORS` is a hex color map aligned with MUI's default theme palette.
Web-app maps these to MUI semantic names; other platforms use the hex values directly.

```ts
import { BOOK_STATUS_COLORS, getStatusColor } from '@my-many-books/shared-design';

// Constant map
BOOK_STATUS_COLORS.reading  // '#1976D2'
BOOK_STATUS_COLORS.paused   // '#ED6C02'
BOOK_STATUS_COLORS.finished // '#2E7D32'
BOOK_STATUS_COLORS.none     // '#757575'

// Helper (returns hex for any BookStatus, falls back to 'none')
const color = getStatusColor(book.status);
```

## Severity

`SEVERITY` and `Severity` have been moved to `@my-many-books/shared-types`.

```ts
import { SEVERITY, type Severity } from '@my-many-books/shared-types';
```

## Themes

`themes` is defined but not yet consumed by any app. Each platform needs to map
the theme color tokens to its own UI framework (MUI / React Native Paper).
