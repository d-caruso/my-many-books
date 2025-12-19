import { act, renderHook, waitFor } from '@testing-library/react';

import { useBooks } from '../useBooks';

describe('useBooks', () => {
  it('auto-loads page 1 on mount and stores results', async () => {
    const now = new Date().toISOString();
    const book = {
      id: 1,
      isbnCode: '9781234567897',
      title: 'Test Book',
      status: 'reading',
      creationDate: now,
      updateDate: now,
    } as const;

    const api = {
      getBooks: jest.fn().mockResolvedValue({
        books: [book],
        pagination: { currentPage: 1, totalPages: 2, totalItems: 10, itemsPerPage: 20 },
      }),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    };

    const { result } = renderHook(() => useBooks(api));

    await waitFor(() => {
      expect(api.getBooks).toHaveBeenCalledWith(1, 20);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.books).toEqual([book]);
    expect(result.current.totalCount).toBe(10);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('loads next page via loadMore and appends results', async () => {
    const now = new Date().toISOString();
    const book1 = { id: 1, isbnCode: '111', title: 'B1', status: 'reading', creationDate: now, updateDate: now } as const;
    const book2 = { id: 2, isbnCode: '222', title: 'B2', status: 'completed', creationDate: now, updateDate: now } as const;

    const api = {
      getBooks: jest
        .fn()
        .mockResolvedValueOnce({
          books: [book1],
          pagination: { currentPage: 1, totalPages: 2, totalItems: 2, itemsPerPage: 20 },
        })
        .mockResolvedValueOnce({
          books: [book2],
          pagination: { currentPage: 2, totalPages: 2, totalItems: 2, itemsPerPage: 20 },
        }),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    };

    const { result } = renderHook(() => useBooks(api));

    await waitFor(() => expect(result.current.books).toEqual([book1]));
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(api.getBooks).toHaveBeenLastCalledWith(2, 20);
    });

    expect(result.current.books).toEqual([book1, book2]);
    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasMore).toBe(false);
  });
});
