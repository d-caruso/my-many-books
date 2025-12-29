// Test for API offline error handling

describe('API Offline Error Handling', () => {
  let mockNetInfo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock NetInfo
    mockNetInfo = {
      fetch: jest.fn(),
    };

    jest.doMock('@react-native-community/netinfo', () => ({
      __esModule: true,
      default: mockNetInfo,
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should import API utilities', () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true });

    delete require.cache[require.resolve('../../src/services/api')];
    const apiModule = require('../../src/services/api');

    expect(apiModule.apiUtils).toBeDefined();
    expect(apiModule.bookAPI).toBeDefined();
    expect(apiModule.userAPI).toBeDefined();
  });

  it('should check network state in isOnline utility', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true });

    delete require.cache[require.resolve('../../src/services/api')];
    const { apiUtils } = require('../../src/services/api');

    const isOnline = await apiUtils.isOnline();
    expect(mockNetInfo.fetch).toHaveBeenCalled();
    expect(isOnline).toBe(true);
  });

  it('should return false when network is disconnected', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false });

    delete require.cache[require.resolve('../../src/services/api')];
    const { apiUtils } = require('../../src/services/api');

    const isOnline = await apiUtils.isOnline();
    expect(isOnline).toBe(false);
  });

  it('should handle null network state', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: null });

    delete require.cache[require.resolve('../../src/services/api')];
    const { apiUtils } = require('../../src/services/api');

    const isOnline = await apiUtils.isOnline();
    expect(isOnline).toBe(false);
  });

  it('should identify offline errors', () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false });

    delete require.cache[require.resolve('../../src/services/api')];
    const { apiUtils } = require('../../src/services/api');

    const mockI18n = require('../../src/i18n');
    const offlineMessage = mockI18n.default?.t?.('offline.errors.noConnection') ||
                           "You're offline. Check your connection and try again.";

    const offlineError = new Error(offlineMessage);
    const networkError = new Error('Network request failed');

    expect(apiUtils.isOfflineError(offlineError)).toBe(true);
    expect(apiUtils.isOfflineError(networkError)).toBe(false);
  });

  it('should throw offline error when handling error while offline', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: false });

    delete require.cache[require.resolve('../../src/services/api')];
    const { apiUtils } = require('../../src/services/api');

    const mockError = new Error('Original error');

    await expect(apiUtils.handleOfflineError(mockError)).rejects.toThrow();
  });

  it('should rethrow original error when online', async () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true });

    delete require.cache[require.resolve('../../src/services/api')];
    const { apiUtils } = require('../../src/services/api');

    const mockError = new Error('Original error');

    await expect(apiUtils.handleOfflineError(mockError)).rejects.toThrow('Original error');
  });

  it('should export API instances', () => {
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true });

    delete require.cache[require.resolve('../../src/services/api')];
    const apiModule = require('../../src/services/api');

    expect(apiModule.bookAPI.getBooks).toBeDefined();
    expect(apiModule.bookAPI.createBook).toBeDefined();
    expect(apiModule.userAPI.getCurrentUser).toBeDefined();
    expect(apiModule.userAPI.login).toBeDefined();
  });
});
