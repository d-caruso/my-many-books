import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeProvider, useTheme } from '../../src/contexts/ThemeContext';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('../../src/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
  };
});

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext hookey emits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('emits theme.changed when the theme mode changes', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.setThemeMode('dark');
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('themeMode', 'dark');
    expect(mockMobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.THEME.CHANGED,
      expect.objectContaining({
        previousThemeMode: 'system',
        nextThemeMode: 'dark',
        source: 'ThemeContext.setThemeMode',
      })
    );
  });
});
