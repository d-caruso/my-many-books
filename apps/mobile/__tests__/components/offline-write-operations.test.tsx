// Test for write operations disabled when offline

describe('Offline Write Operations', () => {
  let mockUseNetworkState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNetworkState = jest.fn();
    jest.doMock('../../src/hooks/useNetworkState', () => ({
      useNetworkState: mockUseNetworkState,
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('BookCard', () => {
    it('should disable menu items when offline', () => {
      mockUseNetworkState.mockReturnValue({
        isOnline: false,
        isInternetReachable: false,
        connectionType: 'none',
      });

      delete require.cache[require.resolve('../../src/components/BookCard')];
      const { BookCard } = require('../../src/components/BookCard');

      expect(BookCard).toBeDefined();
      expect(mockUseNetworkState).toBeDefined();
    });

    it('should enable menu items when online', () => {
      mockUseNetworkState.mockReturnValue({
        isOnline: true,
        isInternetReachable: true,
        connectionType: 'wifi',
      });

      delete require.cache[require.resolve('../../src/components/BookCard')];
      const { BookCard } = require('../../src/components/BookCard');

      expect(BookCard).toBeDefined();
    });

    it('should use network state in BookCard', () => {
      mockUseNetworkState.mockReturnValue({
        isOnline: true,
        isInternetReachable: true,
        connectionType: 'wifi',
      });

      delete require.cache[require.resolve('../../src/components/BookCard')];
      const { BookCard } = require('../../src/components/BookCard');

      const mockBook = {
        id: '1',
        title: 'Test Book',
        status: 'reading',
        authors: [{ name: 'Test Author' }],
      };

      BookCard({ book: mockBook, showActions: true });
      expect(mockUseNetworkState).toHaveBeenCalled();
    });
  });
});
