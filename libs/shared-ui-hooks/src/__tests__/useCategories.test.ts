import { act, renderHook, waitFor } from '@testing-library/react';

import { useCategories } from '../useCategories';

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useCategories', () => {
  it('auto-loads categories on mount and sorts by name', async () => {
    const now = new Date().toISOString();
    const api = {
      getCategories: jest.fn().mockResolvedValue([
        { id: 2, name: 'Zed', creationDate: now, updateDate: now },
        { id: 1, name: 'Alpha', creationDate: now, updateDate: now },
      ]),
      createCategory: jest.fn(),
    };

    const { result } = renderHook(() => useCategories(api));

    await waitFor(() => expect(api.getCategories).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories.map((c) => c.name)).toEqual(['Alpha', 'Zed']);
    expect(result.current.error).toBeNull();
  });

  it('prevents concurrent loadCategories calls', async () => {
    const now = new Date().toISOString();
    const deferred = createDeferred<Array<{ id: number; name: string; creationDate: string; updateDate: string }>>();

    const api = {
      getCategories: jest.fn().mockReturnValue(deferred.promise),
      createCategory: jest.fn(),
    };

    const { result } = renderHook(() => useCategories(api, { autoLoad: false }));

    act(() => {
      void result.current.loadCategories();
      void result.current.loadCategories();
    });

    expect(api.getCategories).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve([{ id: 1, name: 'Only', creationDate: now, updateDate: now }]);
      await deferred.promise;
    });

    expect(result.current.categories.map((c) => c.name)).toEqual(['Only']);
  });

  it('creates categories (trimmed) and keeps list sorted', async () => {
    const now = new Date().toISOString();
    const api = {
      getCategories: jest.fn().mockResolvedValue([
        { id: 1, name: 'Beta', creationDate: now, updateDate: now },
      ]),
      createCategory: jest.fn().mockResolvedValue({ id: 2, name: 'Alpha', creationDate: now, updateDate: now }),
    };

    const { result } = renderHook(() => useCategories(api));
    await waitFor(() => expect(result.current.categories.map((c) => c.name)).toEqual(['Beta']));

    await act(async () => {
      const created = await result.current.createCategory('  Alpha  ');
      expect(created?.name).toBe('Alpha');
    });

    expect(api.createCategory).toHaveBeenCalledWith({ name: 'Alpha' });
    expect(result.current.categories.map((c) => c.name)).toEqual(['Alpha', 'Beta']);

    await act(async () => {
      const created = await result.current.createCategory('   ');
      expect(created).toBeNull();
    });
    expect(api.createCategory).toHaveBeenCalledTimes(1);
  });
});

