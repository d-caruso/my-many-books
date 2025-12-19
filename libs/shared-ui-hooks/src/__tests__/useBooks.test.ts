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

  it('manages book mutations (create/update/status/delete) and counts', async () => {
    const now = new Date().toISOString();
    const created = { id: 1, isbnCode: '111', title: 'B1', status: 'reading', creationDate: now, updateDate: now } as const;
    const updated = { ...created, title: 'B1-updated' } as const;
    const statusUpdated = { ...created, status: 'finished' } as const;

    const api = {
      getBooks: jest.fn(),
      createBook: jest.fn().mockResolvedValue(created),
      updateBook: jest.fn().mockResolvedValue(updated),
      deleteBook: jest.fn().mockResolvedValue(undefined),
      updateBookStatus: jest.fn().mockResolvedValue(statusUpdated),
    };

    const { result } = renderHook(() => useBooks(api, { autoLoad: false }));

    await act(async () => {
      await result.current.createBook({ title: 'B1', isbnCode: '111' });
    });

    expect(result.current.books).toEqual([created]);
    expect(result.current.totalCount).toBe(1);

    await act(async () => {
      await result.current.updateBook(1, { title: 'B1-updated' });
    });
    expect(api.updateBook).toHaveBeenCalledWith(1, { title: 'B1-updated' });
    expect(result.current.books).toEqual([updated]);

    await act(async () => {
      await result.current.updateBookStatus(1, 'finished');
    });
    expect(api.updateBookStatus).toHaveBeenCalledWith(1, 'finished');
    expect(result.current.books).toEqual([statusUpdated]);

    await act(async () => {
      await result.current.deleteBook(1);
    });
    expect(api.deleteBook).toHaveBeenCalledWith(1);
    expect(result.current.books).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('captures loadBooks errors and resets state for page 1', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const api = {
      getBooks: jest.fn().mockRejectedValue(new Error('nope')),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    };

    const { result } = renderHook(() => useBooks(api, { autoLoad: false }));

    await act(async () => {
      await result.current.loadBooks(1);
    });

    expect(result.current.error).toBe('nope');
    expect(result.current.books).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loading).toBe(false);

    consoleSpy.mockRestore();
  });

  it('uses provided pageSize and falls back when books/pagination are missing', async () => {
    const api = {
      getBooks: jest.fn().mockResolvedValue({ books: undefined, pagination: undefined } as any),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    };

    const { result } = renderHook(() => useBooks(api, { autoLoad: false, pageSize: 5 }));

    await act(async () => {
      await result.current.loadBooks(1);
    });

    expect(api.getBooks).toHaveBeenCalledWith(1, 5);
    expect(result.current.books).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not call loadBooks via loadMore when hasMore is false', async () => {
    const api = {
      getBooks: jest.fn(),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    };

    const { result } = renderHook(() => useBooks(api, { autoLoad: false }));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(api.getBooks).not.toHaveBeenCalled();
  });

  it('keeps existing state when loadBooks fails for page > 1 and uses response message', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const now = new Date().toISOString();
    const book1 = { id: 1, isbnCode: '111', title: 'B1', status: 'reading', creationDate: now, updateDate: now } as const;

    const api = {
      getBooks: jest
        .fn()
        .mockResolvedValueOnce({
          books: [book1],
          pagination: { currentPage: 1, totalPages: 2, totalItems: 1, itemsPerPage: 20 },
        })
        .mockRejectedValueOnce({ response: { data: { message: 'page2' } } }),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    };

    const { result } = renderHook(() => useBooks(api));
    await waitFor(() => expect(result.current.books).toEqual([book1]));

    await act(async () => {
      await result.current.loadBooks(2);
    });

    expect(result.current.error).toBe('page2');
    expect(result.current.books).toEqual([book1]);
    expect(result.current.totalCount).toBe(1);

    consoleSpy.mockRestore();
  });

  it('captures errors for create/update/delete/status and rethrows', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const api = {
      getBooks: jest.fn(),
      createBook: jest.fn().mockRejectedValue({ response: { data: { message: 'create' } } }),
      updateBook: jest.fn().mockRejectedValue({ response: { data: { message: 'update' } } }),
      deleteBook: jest.fn().mockRejectedValue({ response: { data: { message: 'delete' } } }),
      updateBookStatus: jest.fn().mockRejectedValue({ response: { data: { message: 'status' } } }),
    };

    const { result } = renderHook(() => useBooks(api, { autoLoad: false }));

    await act(async () => {
      try {
        await result.current.createBook({ title: 'T', isbnCode: '1' });
      } catch {
        // intentional
      }
    });
    await waitFor(() => expect(result.current.error).toBe('create'));

    await act(async () => {
      try {
        await result.current.updateBook(1, { title: 'U' });
      } catch {
        // intentional
      }
    });
    await waitFor(() => expect(result.current.error).toBe('update'));

    await act(async () => {
      try {
        await result.current.updateBookStatus(1, 'reading');
      } catch {
        // intentional
      }
    });
    await waitFor(() => expect(result.current.error).toBe('status'));

    await act(async () => {
      try {
        await result.current.deleteBook(1);
      } catch {
        // intentional
      }
    });
    await waitFor(() => expect(result.current.error).toBe('delete'));

    consoleSpy.mockRestore();
  });

  it('refreshBooks loads page 1 and loadMore returns early when blocked', async () => {
    const now = new Date().toISOString();
    const deferred = (() => {
      let resolve!: (value: any) => void;
      const promise = new Promise<any>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    })();

    const api = {
      getBooks: jest
        .fn()
        .mockResolvedValueOnce({
          books: [{ id: 1, isbnCode: '1', title: 'B1', status: 'reading', creationDate: now, updateDate: now }],
          pagination: { currentPage: 1, totalPages: 2, totalItems: 1, itemsPerPage: 20 },
        })
        .mockReturnValueOnce(deferred.promise)
        .mockResolvedValueOnce({
          books: [{ id: 2, isbnCode: '2', title: 'B2', status: 'reading', creationDate: now, updateDate: now }],
          pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 20 },
        }),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    };

    const { result } = renderHook(() => useBooks(api));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    act(() => {
      void result.current.loadMore();
    });
    expect(api.getBooks).toHaveBeenCalledTimes(2);

    act(() => {
      void result.current.loadMore();
    });
    expect(api.getBooks).toHaveBeenCalledTimes(2);

    await act(async () => {
      deferred.resolve({
        books: [{ id: 2, isbnCode: '2', title: 'B2', status: 'reading', creationDate: now, updateDate: now }],
        pagination: { currentPage: 2, totalPages: 2, totalItems: 2, itemsPerPage: 20 },
      });
      await deferred.promise;
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refreshBooks();
    });

    expect(api.getBooks).toHaveBeenLastCalledWith(1, 20);
    expect(result.current.currentPage).toBe(1);
  });
});
