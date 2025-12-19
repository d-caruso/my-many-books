import { act, renderHook } from '@testing-library/react';

import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates from storage when present and updates storage on set', () => {
    const storage = {
      getItem: jest.fn(() => JSON.stringify({ count: 1 })),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    const { result } = renderHook(() =>
      useLocalStorage('key', { count: 0 }, storage)
    );

    const [value] = result.current;
    expect(storage.getItem).toHaveBeenCalledWith('key');
    expect(value).toEqual({ count: 1 });

    act(() => {
      const [, setValue] = result.current;
      setValue({ count: 2 });
    });

    expect(result.current[0]).toEqual({ count: 2 });
    expect(storage.setItem).toHaveBeenCalledWith('key', JSON.stringify({ count: 2 }));
  });

  it('supports functional updates and remove resets to initialValue', () => {
    const storage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    const { result } = renderHook(() => useLocalStorage('k', 0, storage));

    act(() => {
      const [, setValue] = result.current;
      setValue((prev) => prev + 1);
    });
    expect(result.current[0]).toBe(1);

    act(() => {
      const [, , remove] = result.current;
      remove();
    });

    expect(result.current[0]).toBe(0);
    expect(storage.removeItem).toHaveBeenCalledWith('k');
  });

  it('supports options object with custom (de)serialization', () => {
    const storage = {
      getItem: jest.fn(() => '1'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    const { result } = renderHook(() =>
      useLocalStorage('n', 0, {
        storage,
        serialize: (value: number) => String(value),
        deserialize: (value: string) => Number(value),
      })
    );

    expect(result.current[0]).toBe(1);
  });

  it('handles storage errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });

    const { result } = renderHook(() => useLocalStorage('k', 'init'));
    expect(result.current[0]).toBe('init');

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    act(() => {
      const [, setValue] = result.current;
      setValue('next');
    });
    expect(result.current[0]).toBe('next');

    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('fail');
    });

    act(() => {
      const [, , remove] = result.current;
      remove();
    });
    expect(result.current[0]).toBe('init');

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    removeItemSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
