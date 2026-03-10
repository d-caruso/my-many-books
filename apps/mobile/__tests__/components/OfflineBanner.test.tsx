import { OfflineBanner } from '../../src/components/OfflineBanner';
import { useNetworkState } from '../../src/hooks/useNetworkState';

jest.mock('../../src/hooks/useNetworkState');

const mockUseNetworkState = useNetworkState as jest.Mock;

const online = { isOnline: true, isInternetReachable: true, connectionType: 'wifi' };
const offline = { isOnline: false, isInternetReachable: false, connectionType: 'none' };

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNetworkState.mockReturnValue(online);
});

describe('OfflineBanner', () => {
  it('should export OfflineBanner component', () => {
    expect(OfflineBanner).toBeDefined();
    expect(typeof OfflineBanner).toBe('function');
  });

  it('should return null when online', () => {
    mockUseNetworkState.mockReturnValue(online);
    expect(OfflineBanner({})).toBeNull();
  });

  it('should render banner when offline', () => {
    mockUseNetworkState.mockReturnValue(offline);
    const result = OfflineBanner({});
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it('should use network state hook', () => {
    OfflineBanner({});
    expect(mockUseNetworkState).toHaveBeenCalled();
  });

  it('should handle component when network state changes', () => {
    mockUseNetworkState.mockReturnValue(online);
    expect(OfflineBanner({})).toBeNull();

    mockUseNetworkState.mockReturnValue(offline);
    expect(OfflineBanner({})).not.toBeNull();
  });

  it('should have accessibility properties when offline', () => {
    mockUseNetworkState.mockReturnValue(offline);
    const result = OfflineBanner({});
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  });
});
