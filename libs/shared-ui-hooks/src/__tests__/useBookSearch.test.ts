import { act, renderHook, waitFor } from '@testing-library/react';

import { useBookSearch } from '../useBookSearch';

describe('useBookSearch', () => {
  it('trims query, calls API with q/page/limit, and supports loadMore', async () => {
    const now = new Date().toISOString();
    const book1 = { id: 1, isbnCode: '111', title: 'B1', status: 'reading', creationDate: now, updateDate: now } as const;
    const book2 = { id: 2, isbnCode: '222', title: 'B2', status: 'reading', creationDate: now, updateDate: now } as const;

    const api = {
      searchBooks: jest
        .fn()
        .mockResolvedValueOnce({ books: [book1], total: 2, hasMore: true, page: 1 })
        .mockResolvedValueOnce({ books: [book2], total: 2, hasMore: false, page: 2 }),
      searchByISBN: jest.fn(),
    };

    const { result } = renderHook(() => useBookSearch(api));

    await act(async () => {
      await result.current.searchBooks('  hello  ', { status: 'reading' });
    });

    expect(api.searchBooks).toHaveBeenCalledWith({ q: 'hello', page: 1, limit: 20, status: 'reading' });
    expect(result.current.books).toEqual([book1]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.currentPage).toBe(1);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(api.searchBooks).toHaveBeenLastCalledWith({ q: 'hello', page: 2, limit: 20, status: 'reading' });
    await waitFor(() => expect(result.current.books).toEqual([book1, book2]));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('clears results without calling API when query and filters are empty', async () => {
    const api = {
      searchBooks: jest.fn().mockResolvedValue({ books: [], total: 0, hasMore: false, page: 1 }),
      searchByISBN: jest.fn(),
    };

    const { result } = renderHook(() => useBookSearch(api));

    await act(async () => {
      await result.current.searchBooks('hello');
    });

    expect(api.searchBooks).toHaveBeenCalledTimes(1);
    expect(result.current.currentPage).toBe(1);

    await act(async () => {
      await result.current.searchBooks('   ', {});
    });

    expect(api.searchBooks).toHaveBeenCalledTimes(1);
    expect(result.current.books).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not call loadMore when hasMore is false', async () => {
    const api = {
      searchBooks: jest.fn(),
      searchByISBN: jest.fn(),
    };

    const { result } = renderHook(() => useBookSearch(api));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(api.searchBooks).not.toHaveBeenCalled();
  });

  it('allows empty query when filters are active', async () => {
    const api = {
      searchBooks: jest.fn().mockResolvedValue({ books: [], total: 0, hasMore: false, page: 1 }),
      searchByISBN: jest.fn(),
    };

    const { result } = renderHook(() => useBookSearch(api));

    await act(async () => {
      await result.current.searchBooks('  ', { status: 'reading' });
    });

    expect(api.searchBooks).toHaveBeenCalledWith({ q: '', page: 1, limit: 20, status: 'reading' });
  });

  it('returns null for blank ISBN and captures errors for failed ISBN searches', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const api = {
      searchBooks: jest.fn(),
      searchByISBN: jest.fn().mockRejectedValue(new Error('not found')),
    };

    const { result } = renderHook(() => useBookSearch(api));

    await act(async () => {
      const found = await result.current.searchByISBN('   ');
      expect(found).toBeNull();
    });
    expect(api.searchByISBN).not.toHaveBeenCalled();

    await act(async () => {
      const found = await result.current.searchByISBN('978');
      expect(found).toBeNull();
    });
    expect(api.searchByISBN).toHaveBeenCalledWith('978');
    expect(result.current.error).toBe('not found');

    consoleSpy.mockRestore();
  });

  it('captures searchBooks errors and resets state for page 1', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const api = {
      searchBooks: jest.fn().mockRejectedValue(new Error('fail')),
      searchByISBN: jest.fn(),
    };

    const { result } = renderHook(() => useBookSearch(api));

    await act(async () => {
      await result.current.searchBooks('hello');
    });

    expect(result.current.error).toBe('fail');
    expect(result.current.books).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.currentPage).toBe(1);

    consoleSpy.mockRestore();
  });
});
