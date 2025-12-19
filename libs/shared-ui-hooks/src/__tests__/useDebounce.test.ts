import { act, renderHook } from '@testing-library/react';

import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates the debounced value after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } }
    );

    expect(result.current).toBe('a');

    rerender({ value: 'b', delay: 100 });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe('b');
  });

  it('resets the timer when value changes before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 100 } }
    );

    rerender({ value: 'b', delay: 100 });

    act(() => {
      jest.advanceTimersByTime(50);
    });

    rerender({ value: 'c', delay: 100 });

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current).toBe('c');
  });
});

