import { renderHook } from '@testing-library/react-hooks';
import { useNetworkState } from '../../src/hooks/useNetworkState';

describe('useNetworkState Hook', () => {
  it('should export useNetworkState as a function', () => {
    expect(useNetworkState).toBeDefined();
    expect(typeof useNetworkState).toBe('function');
  });

  it('should return an object with network state properties', () => {
    const { result } = renderHook(() => useNetworkState());

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe('object');
    expect('isOnline' in result.current).toBe(true);
    expect('isInternetReachable' in result.current).toBe(true);
    expect('connectionType' in result.current).toBe(true);
  });

  it('should initialize with default online state', () => {
    const { result } = renderHook(() => useNetworkState());

    expect(typeof result.current.isOnline).toBe('boolean');
  });
});
