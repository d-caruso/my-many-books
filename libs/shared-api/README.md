# @my-many-books/shared-api

Platform-agnostic HTTP client for My Many Books monorepo that works with web, mobile, and desktop apps.

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