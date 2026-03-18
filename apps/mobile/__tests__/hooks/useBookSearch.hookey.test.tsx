import { renderHook, act } from '@testing-library/react-hooks';

import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

const mockSharedSearchBooks = jest.fn();
const mockSharedSearchByIsbn = jest.fn();
const mockSharedClearSearch = jest.fn();
const mockSharedLoadMore = jest.fn();

jest.mock('@my-many-books/shared-ui-hooks', () => ({
  useBookSearch: () => ({
    books: [],
    loading: false,
    error: null,
    hasMore: false,
    totalCount: 0,
    currentPage: 1,
    searchBooks: mockSharedSearchBooks,
    searchByISBN: mockSharedSearchByIsbn,
    clearSearch: mockSharedClearSearch,
    loadMore: mockSharedLoadMore,
  }),
}));

jest.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({
    isOnline: true,
  }),
}));

jest.mock('@/services/api', () => ({
  bookAPI: {
    searchBooks: jest.fn(),
    searchByISBN: jest.fn(),
  },
}));

jest.mock('@/services/database/BookRepository', () => ({
  bookRepository: {
    searchWithFilters: jest.fn(),
  },
}));

jest.mock('@/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('@/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
    RESOURCE_TYPES: {
      BOOK: 'book',
    },
  };
});

jest.unmock('@/hooks/useBookSearch');

const { useBookSearch } = jest.requireActual('@/hooks/useBookSearch') as typeof import('@/hooks/useBookSearch');

describe('useBookSearch hookey emits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedSearchBooks.mockResolvedValue(undefined);
  });

  it('emits search.query when executing a search', async () => {
    const { result } = renderHook(() => useBookSearch());

    await act(async () => {
      await result.current.searchBooks('hookey', { status: 'reading' as never }, 2);
    });

    expect(mobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.SEARCH.QUERY,
      expect.objectContaining({
        query: 'hookey',
        page: 2,
        isOffline: false,
        filters: expect.objectContaining({
          status: 'reading',
        }),
        source: 'useBookSearch.searchBooks',
      })
    );
  });
});
