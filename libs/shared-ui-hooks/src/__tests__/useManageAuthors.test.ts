import { act, renderHook, waitFor } from '@testing-library/react';
import { useManageAuthors } from '../useManageAuthors';

const now = new Date().toISOString();

describe('useManageAuthors', () => {
  it('auto-loads and sorts authors by surname + name', async () => {
    const api = {
      getAuthors: jest.fn().mockResolvedValue([
        { id: 2, name: 'Virginia', surname: 'Woolf', creationDate: now, updateDate: now },
        { id: 1, name: 'Jane', surname: 'Austen', creationDate: now, updateDate: now },
      ]),
      createAuthor: jest.fn(),
      updateAuthor: jest.fn(),
      deleteAuthor: jest.fn(),
    };

    const { result } = renderHook(() => useManageAuthors(api));

    await waitFor(() => expect(api.getAuthors).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.authors.map((a) => `${a.surname} ${a.name}`)).toEqual([
      'Austen Jane',
      'Woolf Virginia',
    ]);
  });

  it('validates createAuthor input and avoids API call on validation failure', async () => {
    const api = {
      getAuthors: jest.fn().mockResolvedValue([]),
      createAuthor: jest.fn(),
      updateAuthor: jest.fn(),
      deleteAuthor: jest.fn(),
    };

    const { result } = renderHook(() => useManageAuthors(api, { autoLoad: false }));

    await act(async () => {
      const response = await result.current.createAuthor({ name: ' ', surname: 'Austen' });
      expect(response.success).toBe(false);
    });

    expect(api.createAuthor).not.toHaveBeenCalled();
    expect(result.current.error?.code).toBe('VALIDATION');
  });

  it('updates an author and keeps local list sorted', async () => {
    const api = {
      getAuthors: jest.fn().mockResolvedValue([
        { id: 1, name: 'Jane', surname: 'Austen', creationDate: now, updateDate: now },
        { id: 2, name: 'Virginia', surname: 'Woolf', creationDate: now, updateDate: now },
      ]),
      createAuthor: jest.fn(),
      updateAuthor: jest.fn().mockResolvedValue({
        id: 2,
        name: 'Virginia',
        surname: 'Aardvark',
        creationDate: now,
        updateDate: now,
      }),
      deleteAuthor: jest.fn(),
    };

    const { result } = renderHook(() => useManageAuthors(api));
    await waitFor(() => expect(result.current.authors).toHaveLength(2));

    await act(async () => {
      const response = await result.current.updateAuthor(2, { surname: 'Aardvark' });
      expect(response.success).toBe(true);
    });

    expect(result.current.authors.map((a) => `${a.surname} ${a.name}`)).toEqual([
      'Aardvark Virginia',
      'Austen Jane',
    ]);
  });

  it('maps delete conflict when author has books', async () => {
    const api = {
      getAuthors: jest.fn().mockResolvedValue([
        { id: 1, name: 'Jane', surname: 'Austen', creationDate: now, updateDate: now },
      ]),
      createAuthor: jest.fn(),
      updateAuthor: jest.fn(),
      deleteAuthor: jest.fn().mockRejectedValue({
        response: { status: 409, data: { error: 'AUTHOR_HAS_BOOKS', message: 'Blocked' } },
      }),
    };

    const { result } = renderHook(() => useManageAuthors(api));
    await waitFor(() => expect(result.current.authors).toHaveLength(1));

    await act(async () => {
      const response = await result.current.deleteAuthor(1);
      expect(response.success).toBe(false);
    });

    expect(result.current.error?.code).toBe('HAS_BOOKS');
    expect(result.current.error?.i18nKey).toBe('dialogs:author.delete_blocked_has_books');
    expect(result.current.authors).toHaveLength(1);
  });
});
