import { act, renderHook } from '@testing-library/react';

import { useAsyncOperation } from '../useAsyncOperation';

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useAsyncOperation', () => {
  it('sets loading true while pending and stores data when resolved', async () => {
    const deferred = createDeferred<string>();
    const asyncFn = jest.fn<Promise<string>, []>(() => deferred.promise);

    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    let execution!: Promise<string | null>;
    act(() => {
      execution = result.current.execute();
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      deferred.resolve('ok');
      await execution;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('ok');
    expect(result.current.error).toBeNull();
  });

  it('captures error message from response.data.message and returns null', async () => {
    const responseError = Object.assign(new Error('wrapped'), { response: { data: { message: 'boom' } } });
    const asyncFn = jest.fn<Promise<string>, []>(() => Promise.reject(responseError));

    const { result } = renderHook(() => useAsyncOperation(asyncFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('boom');
  });

  it('falls back to err.message or default error message', async () => {
    const withMessage = jest.fn<Promise<string>, []>(() => Promise.reject(new Error('oops')));
    const { result, rerender } = renderHook(({ fn }) => useAsyncOperation(fn), { initialProps: { fn: withMessage } });

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error).toBe('oops');

    const withoutMessage = jest.fn<Promise<string>, []>(() => Promise.reject(new Error('')));
    rerender({ fn: withoutMessage });

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.error).toBe('An error occurred');
  });
});
