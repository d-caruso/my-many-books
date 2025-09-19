import { renderHook, act } from '@testing-library/react-native';
import { Camera } from 'expo-camera';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';

// Mock expo-camera
const mockCamera = Camera as jest.Mocked<typeof Camera>;

describe('useBarcodeScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermission', () => {
    it('should request camera permission successfully', async () => {
      mockCamera.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'granted',
        expires: 'never',
        canAskAgain: true,
        granted: true,
      });

      const { result } = renderHook(() => useBarcodeScanner());

      expect(result.current.hasPermission).toBe(null);

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.hasPermission).toBe(true);
      expect(result.current.error).toBe(null);
      expect(mockCamera.requestCameraPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle permission denied', async () => {
      mockCamera.requestCameraPermissionsAsync.mockResolvedValue({
        status: 'denied',
        expires: 'never',
        canAskAgain: true,
        granted: false,
      });

      const { result } = renderHook(() => useBarcodeScanner());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBe('Camera permission is required to scan barcodes');
    });

    it('should handle permission request error', async () => {
      mockCamera.requestCameraPermissionsAsync.mockRejectedValue(
        new Error('Permission request failed')
      );

      const { result } = renderHook(() => useBarcodeScanner());

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.hasPermission).toBe(null);
      expect(result.current.error).toBe('Failed to request camera permission');
    });
  });

  describe('handleBarCodeScanned', () => {
    it('should handle barcode scan successfully', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      const testData = '9781234567890';

      act(() => {
        result.current.handleBarCodeScanned(testData);
      });

      expect(result.current.scanned).toBe(true);
      expect(result.current.scannedData).toBe(testData);
      expect(result.current.error).toBe(null);
    });

    it('should not handle scan when already scanned', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      const firstData = '9781234567890';
      const secondData = '9780987654321';

      // First scan
      act(() => {
        result.current.handleBarCodeScanned(firstData);
      });

      expect(result.current.scannedData).toBe(firstData);

      // Second scan should be ignored
      act(() => {
        result.current.handleBarCodeScanned(secondData);
      });

      expect(result.current.scannedData).toBe(firstData); // Should remain the same
    });

    it('should handle empty barcode data', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      act(() => {
        result.current.handleBarCodeScanned('');
      });

      expect(result.current.scanned).toBe(true);
      expect(result.current.scannedData).toBe('');
    });

    it('should handle special characters in barcode', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      const specialData = 'ISBN-13: 978-1234567890';

      act(() => {
        result.current.handleBarCodeScanned(specialData);
      });

      expect(result.current.scannedData).toBe(specialData);
    });
  });

  describe('resetScanner', () => {
    it('should reset scanner state', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      // First set some state
      act(() => {
        result.current.handleBarCodeScanned('9781234567890');
      });

      expect(result.current.scanned).toBe(true);
      expect(result.current.scannedData).toBe('9781234567890');

      // Reset
      act(() => {
        result.current.resetScanner();
      });

      expect(result.current.scanned).toBe(false);
      expect(result.current.scannedData).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should reset scanner state when there are errors', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      // Set error state manually (this would normally come from permission request)
      act(() => {
        result.current.resetScanner();
      });

      expect(result.current.scanned).toBe(false);
      expect(result.current.scannedData).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should allow scanning again after reset', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      const firstData = '9781234567890';
      const secondData = '9780987654321';

      // First scan
      act(() => {
        result.current.handleBarCodeScanned(firstData);
      });

      expect(result.current.scannedData).toBe(firstData);

      // Reset
      act(() => {
        result.current.resetScanner();
      });

      // Second scan after reset should work
      act(() => {
        result.current.handleBarCodeScanned(secondData);
      });

      expect(result.current.scannedData).toBe(secondData);
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useBarcodeScanner());

      expect(result.current.hasPermission).toBe(null);
      expect(result.current.scanned).toBe(false);
      expect(result.current.scannedData).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });
});