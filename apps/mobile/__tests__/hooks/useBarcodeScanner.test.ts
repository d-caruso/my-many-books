import { renderHook, act } from '@testing-library/react-hooks';
import { Camera } from 'expo-camera';
import { useBarcodeScanner } from '../../src/hooks/useBarcodeScanner';

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

const mockRequestCameraPermissionsAsync = Camera.requestCameraPermissionsAsync as jest.Mock;

describe('useBarcodeScanner Hook Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export useBarcodeScanner as a function', () => {
    expect(useBarcodeScanner).toBeDefined();
    expect(typeof useBarcodeScanner).toBe('function');
  });

  it('should return correct initial state', () => {
    const { result } = renderHook(() => useBarcodeScanner());

    expect(result.current.hasPermission).toBeNull();
    expect(result.current.scanned).toBe(false);
    expect(result.current.scannedData).toBeNull();
    expect(result.current.error).toBeNull();
    expect(typeof result.current.requestPermission).toBe('function');
    expect(typeof result.current.handleBarCodeScanned).toBe('function');
    expect(typeof result.current.resetScanner).toBe('function');
  });

  it('should set hasPermission to true when permission granted', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true });

    const { result } = renderHook(() => useBarcodeScanner());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(mockRequestCameraPermissionsAsync).toHaveBeenCalled();
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should set hasPermission to false and error when permission denied', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false });

    const { result } = renderHook(() => useBarcodeScanner());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe('Camera permission is required to scan barcodes');
  });

  it('should set error when permission request throws', async () => {
    mockRequestCameraPermissionsAsync.mockRejectedValue(new Error('Permission request failed'));

    const { result } = renderHook(() => useBarcodeScanner());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(result.current.error).toBe('Failed to request camera permission');
  });

  it('should update scanned state on handleBarCodeScanned', () => {
    const { result } = renderHook(() => useBarcodeScanner());

    act(() => {
      result.current.handleBarCodeScanned('9781234567890');
    });

    expect(result.current.scanned).toBe(true);
    expect(result.current.scannedData).toBe('9781234567890');
    expect(result.current.error).toBeNull();
  });

  it('should not update scannedData when already scanned', () => {
    const { result } = renderHook(() => useBarcodeScanner());

    act(() => {
      result.current.handleBarCodeScanned('9781234567890');
    });

    act(() => {
      result.current.handleBarCodeScanned('0000000000000');
    });

    expect(result.current.scannedData).toBe('9781234567890');
  });

  it('should reset scanner state', () => {
    const { result } = renderHook(() => useBarcodeScanner());

    act(() => {
      result.current.handleBarCodeScanned('9781234567890');
    });

    act(() => {
      result.current.resetScanner();
    });

    expect(result.current.scanned).toBe(false);
    expect(result.current.scannedData).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
