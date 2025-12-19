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
});
