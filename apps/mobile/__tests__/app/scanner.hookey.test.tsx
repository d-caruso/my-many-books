import React from 'react';
import renderer from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';

import ScannerScreen from '../../app/(tabs)/scanner';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';
import { useBookSearch } from '@/hooks/useBookSearch';
import {
  HOOK_PAYLOAD_DESTINATIONS,
  HOOK_PAYLOAD_SOURCES,
} from '@/services/hooks/hookPayloadConstants';

const mockSetStringAsync = jest.fn();
const mockUseBookSearch = useBookSearch as jest.MockedFunction<typeof useBookSearch>;

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
}));

jest.mock('@/hooks/useBookSearch', () => ({
  useBookSearch: jest.fn(),
}));

jest.mock('@/components/scanner/BarcodeScannerPanel', () => ({
  BarcodeScannerPanel: ({ onDetected }: { onDetected: (isbn: string) => Promise<void> }) => (
    <TouchableOpacity testID="barcode-detected" onPress={() => onDetected('9780306406157')}>
      <Text>detect</Text>
    </TouchableOpacity>
  ),
}));

jest.mock('@/components/ScannerErrorBoundary', () => ({
  ScannerErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

const { router } = jest.requireMock('expo-router') as {
  router: {
    push: jest.Mock;
  };
};

describe('ScannerScreen hookey emits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBookSearch.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
      currentPage: 1,
      isOffline: false,
      searchBooks: jest.fn().mockResolvedValue(undefined),
      searchByISBN: jest.fn().mockResolvedValue({
        id: 11,
        title: 'Detected Book',
        authors: [],
        categories: [],
        status: 'reading',
        creationDate: '2026-03-18',
        updateDate: '2026-03-18',
      }),
      clearSearch: jest.fn(),
      loadMore: jest.fn(),
    } as ReturnType<typeof useBookSearch>);
    mockSetStringAsync.mockResolvedValue(undefined);
  });

  it('emits scanner detection, copy success, and route decision events', async () => {
    let tree!: renderer.ReactTestRenderer;

    renderer.act(() => {
      tree = renderer.create(<ScannerScreen />);
    });

    await renderer.act(async () => {
      await tree.root.findByProps({ testID: 'barcode-detected' }).props.onPress();
    });

    expect(mobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.SCANNER.ISBN.DETECTED,
      expect.objectContaining({
        isbn: '9780306406157',
        source: HOOK_PAYLOAD_SOURCES.SCANNER_SCREEN,
      })
    );
    expect(mobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.SCANNER.COPY.SUCCESS,
      expect.objectContaining({
        isbn: '9780306406157',
        inputMode: 'scan',
      })
    );
    expect(mobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.SCANNER.ROUTE_DECISION,
      expect.objectContaining({
        isbn: '9780306406157',
        destination: HOOK_PAYLOAD_DESTINATIONS.SEARCH,
        matchedBookId: 11,
      })
    );
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/(tabs)/search',
      params: { isbn: '9780306406157', scannerCopy: 'success' },
    });
  });
});
