# @my-many-books/shared-api

Platform-agnostic HTTP client for My Many Books monorepo that works with web, mobile, and desktop apps.

## API Reference

### BookApi

#### getBooks(page?, limit?, includeAuthors?, includeCategories?, updatedSince?)

Fetches books with optional pagination and incremental sync support.

**Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Books per page (default: 10)
- `includeAuthors` (boolean, optional): Include author data (default: true)
- `includeCategories` (boolean, optional): Include category data (default: true)
- `updatedSince` (string, optional): ISO timestamp for incremental sync (e.g., "2024-12-01T10:00:00.000Z")

**Returns:** `Promise<PaginatedResponse<Book>>`

**Examples:**
```typescript
// Get all books (default behavior)
const allBooks = await bookApi.getBooks();

// Get books with pagination
const pagedBooks = await bookApi.getBooks(2, 20);

// Get books updated since last sync (incremental sync)
const updatedBooks = await bookApi.getBooks(1, 50, true, true, "2024-12-01T10:00:00.000Z");
```

**Incremental Sync Usage:**
The `updatedSince` parameter enables efficient mobile sync by fetching only books modified after a specific timestamp:

```typescript
// Store last sync time
const lastSyncTime = await getLastSyncTime();

// Fetch only updated books
const { books } = await bookApi.getBooks(1, 100, true, true, lastSyncTime);

// Process updated books...

// Update last sync time
await setLastSyncTime(new Date().toISOString());
```

This reduces bandwidth usage by 90%+ for typical sync operations.

## Testing Support

This library provides industry-standard Jest mocking utilities for testing:

### Basic Usage

```typescript
import { createMockApiClient, resetApiClientMocks } from '@my-many-books/shared-api';

// In your Jest tests
jest.mock('@my-many-books/shared-api', () => ({
  createApiClient: jest.fn(() => createMockApiClient()),
  createMockApiClient,
}));

// Access the mock in tests
const mockApiClient = createMockApiClient();
```

### Test Utilities

- `createMockApiClient()` - Creates a fully mocked API client
- `resetApiClientMocks(mockApiClient)` - Resets all mock functions
- `setupMockResponses(mockApiClient)` - Sets up default successful responses

### Example Test

```typescript
import { createApiClient, createMockApiClient } from '@my-many-books/shared-api';

jest.mock('@my-many-books/shared-api', () => ({
  createApiClient: jest.fn(() => createMockApiClient()),
  createMockApiClient: jest.requireActual('@my-many-books/shared-api').createMockApiClient,
}));

describe('API Service', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    mockApiClient = (createApiClient as jest.Mock).mock.results[0].value;
  });

  test('calls books API correctly', async () => {
    mockApiClient.books.getBooks.mockResolvedValue({ books: [], pagination: {} });
    
    const result = await apiService.getBooks();
    
    expect(mockApiClient.books.getBooks).toHaveBeenCalledWith(1, 10);
    expect(result).toEqual({ books: [], pagination: {} });
  });
});
```

This approach provides:
- Full type safety
- Industry-standard Jest mocking
- Easy mock setup and teardown
- Precise assertion capabilities