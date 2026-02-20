import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useISBNScanner } from '../../hooks/useISBNScanner';
import { ScanResult } from '../../hooks/../types';

// Mock scanner controls
const mockControls = { stop: vi.fn() };

// Mock ZXing browser reader
const mockCodeReader = {
  decodeFromConstraints: vi.fn().mockResolvedValue(mockControls),
};

const MockBrowserMultiFormatReader = vi.fn(() => mockCodeReader);

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: MockBrowserMultiFormatReader,
}));

vi.mock('@zxing/library', () => ({
  NotFoundException: vi.fn(),
  DecodeHintType: { POSSIBLE_FORMATS: 'POSSIBLE_FORMATS', TRY_HARDER: 'TRY_HARDER' },
  BarcodeFormat: { EAN_13: 'EAN_13', EAN_8: 'EAN_8' },
}));

// Mock navigator.mediaDevices
const mockMediaDevices = {
  enumerateDevices: vi.fn(),
  getUserMedia: vi.fn(),
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
});

// Mock console.error to keep tests clean
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

describe('useISBNScanner', () => {
  let mockOnScanSuccess: any;
  let mockOnScanError: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnScanSuccess = vi.fn();
    mockOnScanError = vi.fn();

    // Default mock implementations
    mockMediaDevices.enumerateDevices.mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Camera 2' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' },
    ]);

    mockMediaDevices.getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });

    mockCodeReader.decodeFromConstraints.mockResolvedValue(mockControls);
  });

  afterEach(() => {
    consoleSpy.mockClear();
    consoleWarnSpy.mockClear();
    consoleDebugSpy.mockClear();
  });

  test('initializes with default state', () => {
    const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

    expect(result.current.isScanning).toBe(false);
    expect(result.current.hasPermission).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.devices).toEqual([]);
    expect(result.current.selectedDeviceId).toBe(null);
    expect(typeof result.current.startScanning).toBe('function');
    expect(typeof result.current.stopScanning).toBe('function');
    expect(typeof result.current.switchCamera).toBe('function');
    expect(typeof result.current.requestPermission).toBe('function');
    expect(typeof result.current.setVideoElement).toBe('function');
    expect(typeof result.current.videoRef).toBe('function');
  });

  test('initializes BrowserMultiFormatReader on mount', async () => {
    const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

    // Set up video element
    const mockVideo = document.createElement('video');
    act(() => {
      result.current.setVideoElement(mockVideo);
    });

    // The reader is initialized lazily when startScanning is called
    await act(async () => {
      await result.current.startScanning();
    });

    // Wait for the dynamic import and initialization
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(MockBrowserMultiFormatReader).toHaveBeenCalled();
  });

  test('cleans up scanner controls on unmount', async () => {
    const { result, unmount } = renderHook(() => useISBNScanner(mockOnScanSuccess));

    // Set up video element
    const mockVideo = document.createElement('video');
    act(() => {
      result.current.setVideoElement(mockVideo);
    });

    // Initialize the reader by starting scanning
    await act(async () => {
      await result.current.startScanning();
    });

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 50));

    unmount();

    expect(mockControls.stop).toHaveBeenCalled();
  });

  describe('requestPermission', () => {
    test('requests camera permission successfully', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      let permissionResult: boolean = false;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
      expect(permissionResult).toBe(true);
      expect(result.current.hasPermission).toBe(true);
      expect(result.current.error).toBe(null);
    });

    test('handles permission denied', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      let permissionResult: boolean = true;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(permissionResult).toBe(false);
      expect(result.current.hasPermission).toBe(false);
      expect(result.current.error).toBe('Failed to access camera. Please check your camera permissions.');
    });

    test('loads devices after getting permission', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.devices).toHaveLength(2);
      expect(result.current.devices[0].label).toBe('Camera 1');
      expect(result.current.devices[1].label).toBe('Camera 2');
    });
  });

  describe('setVideoElement', () => {
    test('sets video element reference', () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      expect(result.current.videoRef()).toBe(mockVideoElement);
    });

    test('can clear video element reference', () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      expect(result.current.videoRef()).toBe(mockVideoElement);

      act(() => {
        result.current.setVideoElement(null);
      });

      expect(result.current.videoRef()).toBe(null);
    });
  });

  describe('startScanning', () => {
    test('attempts to start scanning with permission and video element', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      // Setup
      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      // Start scanning
      await act(async () => {
        await result.current.startScanning();
      });

      expect(mockCodeReader.decodeFromConstraints).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            deviceId: { exact: 'camera1' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }),
        }),
        mockVideoElement,
        expect.any(Function)
      );
    });

    test('does not start scanning without permission', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.isScanning).toBe(false);
      expect(result.current.error).toBe('Scanner not properly initialized');
      expect(mockCodeReader.decodeFromConstraints).not.toHaveBeenCalled();
    });

    test('does not start scanning without video element', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      // Get permission but don't set video element
      await act(async () => {
        await result.current.requestPermission();
      });

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.isScanning).toBe(false);
      expect(result.current.error).toBe('Scanner not properly initialized');
      expect(mockCodeReader.decodeFromConstraints).not.toHaveBeenCalled();
    });

    test('handles scanning errors', async () => {
      mockCodeReader.decodeFromConstraints.mockRejectedValue(new Error('Scanning failed'));

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess, mockOnScanError));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.error).toBe('Failed to start camera');
      expect(result.current.isScanning).toBe(false);
      expect(mockOnScanError).toHaveBeenCalledWith('Failed to start camera');
    });
  });

  describe('stopScanning', () => {
    test('stops scanning', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      // Set up video element
      const mockVideo = document.createElement('video');
      act(() => {
        result.current.setVideoElement(mockVideo);
      });

      // Initialize the reader by starting scanning
      await act(async () => {
        await result.current.startScanning();
      });

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 50));

      // Stop scanning
      act(() => {
        result.current.stopScanning();
      });

      expect(result.current.isScanning).toBe(false);
      expect(mockControls.stop).toHaveBeenCalled();
    });

    test('can stop scanning even if not currently scanning', () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      act(() => {
        result.current.stopScanning();
      });

      expect(result.current.isScanning).toBe(false);
    });
  });

  describe('switchCamera', () => {
    test('switches to next available camera', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      // Setup
      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      // Start with first camera
      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.selectedDeviceId).toBe('camera1');

      // Switch camera
      await act(async () => {
        result.current.switchCamera();
      });

      expect(result.current.selectedDeviceId).toBe('camera2');
    });

    test('cycles back to first camera after reaching the last', async () => {
      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      // Setup
      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Switch to second camera
      await act(async () => {
        result.current.switchCamera();
      });

      expect(result.current.selectedDeviceId).toBe('camera2');

      // Switch again (should cycle back to first)
      await act(async () => {
        result.current.switchCamera();
      });

      expect(result.current.selectedDeviceId).toBe('camera1');
    });

    test('does nothing if no devices available', async () => {
      mockMediaDevices.enumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.switchCamera();
      });

      expect(result.current.selectedDeviceId).toBe(null);
    });
  });

  describe('scan result handling', () => {
    test('calls onScanSuccess when scan is successful', async () => {
      // Using a known valid ISBN-13: 9780747532699 (Harry Potter book)
      const validISBN = '9780747532699';
      const mockScanResult: ScanResult = {
        isbn: validISBN,
        success: true,
      };

      let scanCallback: ((result: any, error?: any) => void) | undefined;

      mockCodeReader.decodeFromConstraints.mockImplementation((constraints, video, callback) => {
        scanCallback = callback;
        return Promise.resolve(mockControls);
      });

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Simulate successful scan
      act(() => {
        if (scanCallback) {
          scanCallback({ getText: () => validISBN, getBarcodeFormat: () => 'EAN_13' }, null);
        }
      });

      expect(mockOnScanSuccess).toHaveBeenCalledWith(mockScanResult);
    });

    test('rejects non-ISBN EAN-13 barcodes (no 978/979 prefix)', async () => {
      const nonISBNBarcode = '5477148210281';

      let scanCallback: ((result: any, error?: any) => void) | undefined;

      mockCodeReader.decodeFromConstraints.mockImplementation((constraints, video, callback) => {
        scanCallback = callback;
        return Promise.resolve(mockControls);
      });

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Simulate scan with a non-ISBN EAN-13 barcode
      act(() => {
        if (scanCallback) {
          scanCallback({ getText: () => nonISBNBarcode, getBarcodeFormat: () => 'EAN_13' }, null);
        }
      });

      expect(mockOnScanSuccess).not.toHaveBeenCalled();
      expect(result.current.isScanning).toBe(true);
    });

    test('logs warning for non-NotFoundException scan errors', async () => {
      let scanCallback: ((result: any, error?: any) => void) | undefined;

      mockCodeReader.decodeFromConstraints.mockImplementation((constraints, video, callback) => {
        scanCallback = callback;
        return Promise.resolve(mockControls);
      });

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess, mockOnScanError));

      const mockVideoElement = document.createElement('video') as HTMLVideoElement;

      await act(async () => {
        await result.current.requestPermission();
      });

      act(() => {
        result.current.setVideoElement(mockVideoElement);
      });

      await act(async () => {
        await result.current.startScanning();
      });

      // Simulate scan error (non-NotFoundException)
      act(() => {
        if (scanCallback) {
          scanCallback(null, new Error('No barcode found'));
        }
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Scan error:', expect.any(Error));
    });
  });

  describe('error handling', () => {
    test('handles device enumeration errors', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValue(new Error('Device access error'));

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.devices).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error getting video devices:', expect.any(Error));
    });

    test('clears error when operation succeeds after failure', async () => {
      // First call fails
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      const { result } = renderHook(() => useISBNScanner(mockOnScanSuccess));

      // First request fails
      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toBe('Failed to access camera. Please check your camera permissions.');

      // Second call succeeds
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      });

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.hasPermission).toBe(true);
    });
  });
});
